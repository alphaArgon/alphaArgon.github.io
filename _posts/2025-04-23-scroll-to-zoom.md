---
title: Scroll to Zoom 后记
cover: images/scroll-to-zoom-banner.png
excerpt: 谁想在 2025 年用 Objective-C 开发兼容到 macOS High Sierra 的应用啊？本文将讨论 “滚动来缩放” 的实现思路、原理，以及有意思的系统兼容性问题。
---

> 谁想在 2025 年用 Objective-C 开发兼容到 macOS High Sierra 的应用啊？

在此前，我只能找到一个免费 app，LinearMouse 能将滚轮转化为缩放手势。但是它不好用，还附带了很多我不需要的功能。

那自己写吧 ♫。

这个 app 叫 Scroll to Zoom，中文本地化为「滚动来缩放」。名字和朴素，功能也单纯：按住某些修饰键时，将滚轮事件转化为缩放手势。但是它的细节比我开坑时想象得多；它值得一个后记。

## 技术栈选择

几乎没想就用 Objective-C；Swift 调用 CF 函数实在是太痛苦了。另外对于精确的 CFType 生命周期管理，`Unmanaged` 非常繁琐，ARC 开销也大[^arc-cost]。能手动管理内存不很棒吗。

[^arc-cost]: ARC 会在对象被函数调用前后加一对 retain/release 调用。另外 retain/release 是线程安全的，会上锁。Scroll to Zoom 只在主线程运行，不需要这些开销。

Swift ABI 在 macOS Mojave 的某个小版本才稳定。编译在此之前的 app 会额外捆绑一个 runtime lib。为什么要支持到 macOS High Sierra 呢？这是我最早开始主力用 Mac 的系统版本；我对象现在也会用 High Sierra。项目 README 的截图也是 High Sierra 下的。OS **X** 多好看啊。

## CGEventTap

CGEvent API 由 SkyLight.framework 负责。[`CGEventTapCreate`](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate(tap:place:options:eventsofinterest:callback:userinfo:)) 接受三个选项：

- [`CGEventTapLocation`](https://developer.apple.com/documentation/coregraphics/cgeventtaplocation)：在事件的哪一个阶段执行 callback。
- [`CGEventTapPlacement`](https://developer.apple.com/documentation/coregraphics/cgeventtapplacement)：在当前 tap 列表中，要插入到最前还是最后。
- [`CGEventTapOptions`](https://developer.apple.com/documentation/coregraphics/cgeventtapoptions)：目前只支持是否为仅监听。

同一个事件送往每个 tap，callback 拿到的 `CGEventRef` 都是从 Mach port 新建的；它只是一个本地副本。所以很不幸，我们没办法通过指针判断在不同阶段拿到的事件是否相同。但是我们有 `kCGEventSourceUserData` field。大多数事件这个 field 都为 0。监听同一个事件的两个阶段，可以在前阶段设置此 field，再在后阶段读取并清除。

对于 `kCGEventTapOptionDefault` 的 tap，如果 callback 执行时间过长，事件系统会禁用这个 tap。对于仅监听的 tap，事件系统不需要等待 callback 进程返回。仅监听 tap 修改事件也是被允许的，就是它不会被同步回去事件系统。

Callback 可以返回一个不同的事件以替换原先事件。替换的事件需要 +1 retain，原事件不需 release。如果不做修改，则需原样返回原事件。这种所有权管理像是自相矛盾。如果 location 为 `kCGAnnotatedSessionEventTap`，替换的事件似乎会被忽略；但对原事件的修改（不改变事件类型）会保留。

## Event Phases

滚轮事件有这些阶段：

- May begin：在双指接触触控板时。Magic Mouse 没有此 phase。
- Cancelled：在双指离开触控板时，且滚动未发生。

NSScrollView 在收到 may begin 的事件时就会显示滚动条。

- Began/changed/ended：连续的精确滚动。

目前只有苹果的触控板和鼠标会发送这些事件。

- None：一般鼠标的滚动，或者精确滚动进入了惯性阶段。

对于滚动惯性，也有这些阶段：

- Begin/continue/end：连续的惯性滚动。
- None：没有惯性滚动。

所以要判断滚轮事件是否是精确的，可以检查滚动 phase 或滚动惯性 phase 是否有任意一个不为 none[^check-precise-scroll]。

[^check-precise-scroll]: CGEvent 还提供了一个 field `kCGScrollWheelEventIsContinuous`。这两种判断应该是等价的，不过在 Scroll to Zoom 只判断 phase。

缩放手势有跟滚轮事件一样的 phase。不过经过测试，如果缩放传送了 may begin 事件，AppKit 可能忽略整个手势。

值得注意的是，这些 phase 在 CoreGraphics 还是 AppKit 中都被定义为 option flags。我还没测试出来会包含多个 phase flag 的滚轮或缩放手势事件。

## 状态切换

要优雅地实现滚动来缩放，事件的 phase 需要服从正常的生命周期，否则可能会卡住。例如我用 Magic Mouse 浏览文件时，可能手指滚动完还停留在上盖时，就想按下修饰键来切换到缩放：

```
 Mouse: began -> changed -> changed -> changed -> ended
                          ^ trigger zoom
```

要正确地结束这个 changed phase，则需要在下一个滚轮事件到来时候，将收到的滚轮事件设为 ended 并返回，然后额外发送一个 zoom gesture began 事件：

```
Scroll: began -> changed -> ended ·····················
  Zoom: ····················· began -> changed -> ended
                          ^ trigger zoom
```

所以我们需要一直监听滚轮事件来保证 phase 处理正确。

Scroll to Zoom 设计了 `STZWheelSession` 来描述滚轮状态。用 Swift 风格的伪代码描述总体逻辑会更直观：

```swift
enum STZWheelType {
    case scroll          //  普通（连续）滚动
    case scrollMomentum  //  惯性滚动
    case zoom            //  滚动来缩放
}

enum STZWheelSession {
    case free                     // 无状态
    case willBegin(STZWheelType)  // 已发送 may begin 事件
    case didBegin(STZWheelType)   // 已发送 began 事件
}
```

例如，如果旧状态是 `.didBegin(.scroll)`，并收到了 phase 为 changed 的滚轮事件。要将其转化为滚动来缩放，`STZWheelSessionUpdate` 会将该滚轮事件的 phase 修改为 ended，返回一个额外的 phase 为 begin 的缩放手势事件，然后将状态更新为 `.didBegin(.zoom)`。随后调用者发布这个额外的事件。如果又收到了一个 phase 为 changed 的滚轮事件，仍然要将其转化为缩放，`STZWheelSessionUpdate` 会要求丢弃这个事件，并将其替换为返回的额外的 phase 为 begin 的缩放手势事件，状态保持不变。

实际的逻辑会更复杂一些。比如收到了不连续的滚轮事件，因为它的 phase 为 none，在要求的类型为 `.scroll`（即不变）时 session 会被清空为 `.free`；而在其他类型时候，它的 phase 会被视为 change，状态更新为 `.didBegin(STZWheelType)`，并返回额外的 phase 为 begin/changed 的缩放手势事件。而对于连续滚轮，因为触发频繁，实际上会在要求转化为滚动来缩放后，将第一次滚轮丢弃并清空状态，在第二次在正式切换为缩放态。

## 手势释放

LinearMouse 只会在修饰键松开时结束缩放，而在手指离开触控板的时候什么都不会发生。对于 Mac Safari (NSScrollView) 来说，缩放手势不结束，网页就不会在新的缩放比例下重新渲染，会糊。

Scroll to Zoom 很好地解决了这点。对于连续滚轮，在 phase 为 ended 的时候就能结束缩放；对于一般滚轮，在一次滚动结束后的 0.35 秒内如果没有其他滚动，也会结束缩放。当然，释放修饰键也会立即结束缩放。

对于惯性滚动又有一个问题。平滑滚动通常有这样的 phases：

```
  Scroll: may begin? -> began -> changed+ -> ended ····························
Momentum: ········································· began -> continue+ -> ended
```

对应到缩放，它会在 scroll ended 的时候结束缩放手势，在 momentum began 的时候有开启新的手势。然而如前文所说，NSScrollView 在手势结束时会重新渲染。整页渲染开支较大，对于网页尤甚，因此这里的紧接的结束/开始会导致 Safari 卡顿。

我们需要有一种方法来判断 scroll ended 后会不会有 momentum 阶段。但是很不幸，公开的 API 没有相关的资料。因此，目前的实现是在 scroll ended 后监听 0.05 秒。只有在其中没有收到新的滚轮事件，才释放滚动手势。

## 单一职责

Scroll to Zoom 负责「滚动来缩放」；它不会修改其他的鼠标行为。但用户或许会使用其他鼠标优化工具。如果这些工具能够平滑鼠标滚动，那它们也应该能够平滑 Scroll to Zoom 生成的缩放。

其他工具也会注册自己的 event tap。我们需要在任一 tap 修改事件前收集必要的信息，并监听所有 tap 修改后的滚轮事件。然而注册的顺序直接影响了 event tap 在列表中的顺序。

幸好系统提供了监听 tap 添加和移除的 Mach 通知。我们可以在得知 tap list 变更后，在合适的场合（修饰键按下时）重新注册 Scroll to Zoom 的 tap。在发现这个方法之前，我用的是 `-[NSWorkspace runningApplications` 的 KVO 监听 app。

这里抱怨一下：LinearMouse 绝大多数事件都监听在 HID 阶段，而 Mos 监听在 annotated session 阶段。这导致 Scroll to Zoom 监听跨越得太大。而且 annotated session 不能直接返回类型不同的事件，必须重新 post 出去，有一定性能损失。

## 性能优化

Scroll to Zoom 现在有以下 tap：

- `hardFlagsChanged` — HID 阶段，仅监听
- `hardScrollWheel` — HID 阶段，读写
- `passiveScrollWheel` — annotated session 阶段，仅监听
- `mutatingScrollWheel` — annotated session 阶段，读写

鉴于当前的事件识别方法，`hardScrollWheel` 要标记缩放方向，必须能够读写。为了提高性能，只在修饰键按下的时候才启用这个 tap。

`passiveScrollWheel` 和 `mutatingScrollWheel` 是一对互斥的 tap。正常缩放时，仅启用 passive tap，用来记录滚轮的状态。当修饰键按下时，切换到 mutating tap，此时可能将修改或替换事件。当修饰键未被按下、滚轮状态为 `.free`，且没有修改上一次事件时，才从 mutating 切换回 passive。

四个 tap 会比较繁琐。不过相比于 v1.0b1 只用两个 tap（相同阶段不细分）来说，正常滚动时 CPU 占用降低了约一半。

## 缩放方向

这就是非常有趣的问题了。要是某个 app 原生支持滚动缩放，你很难猜出鼠标往上往下滚，画面是放大还是缩小；不同 app 之间的想法还不一定相同。

Scroll to Zoom 对这个问题的解决方案是，根据手指移动的方向，而不是滚动的方向，来决定缩放的方向。默认情况，无论有没有开启滚轮反转（自然滚动），手指向上滑动都是放大。

这要求我们能够记录滚轮事件未转化的 delta。一开始我用私有 API `CGEventCopyIOHIDEvent` 获取硬件事件，拿到原始的滚动距离。然而在 High Sierra 下，这个函数总是返回 `NULL`。好在我注意力足够，发现了 `-[NSEvent isDirectionInvertedFromDevice]` 这个方法。反编译得知，它只是检查包含的 CGEvent 的 field `137`。这个 field 没有公开符号名，但是我测试广泛可用。

LinearMouse 的滚轮反转会修改 IODIDEvent 的数据，而 Mos 的平滑事件发布在 annotated session，因此我们不能同时获得原始滚动方向和修改事件。Scroll to Zoom 在早期的 tap callback 中获取滚动方向的符号，并将其记录在事件的 `kCGEventSourceUserData` field 中（如果没有被使用），并在晚期的 callback 重新读取这个值。

为什么不用全局变量记录符号？例如在性能不够的情况下，后来事件的 HID tap 可能会早于先来事件 annotated session tap 被处理。当然这是个后备手段，如果 user data 已经被占用，就会会退回这一方法。

## UI 兼容

Apple 在兼容性上一直都是不做人的。

- NSOutlineView：在旧版本中必须显式指定 `outlineTableColumn`
- NSTextField：在旧版本中设置（cell 的）`backgroundStyle` 没有效果
- NSToolbarItem：在旧版本中设置 view 必须先 `-sizeToFit`

Scroll to Zoom 的修饰键输入框是自绘的控件，绘制使用了一些 “神乎其技” 的混合模式（destination in，用于蒙版）。然而在 High Sierra 下该被裁成透明的内容变成纯黑了。

直到我反应过来这个 rect 像是直接 drawn 到了 window backing store 上了。在 macOS Mojave 根视图默认启用 layer 后，每个 subview 才默认有自己的 hosting graphics。最后的 workaround 是，如果它有 layer，那就直接绘制；否则创建一个新的 context，在其上绘制，再将这个 context 绘制回去。

## 期望的功能

- 对于一般鼠标，允许按住侧边键而不是修饰键来缩放 — 在 v1.0b2 已经实现
- 对于 Magic Mouse，点一下上盖并按住来启用缩放 — 目前很难实现。点击上盖并不会发送 CGEvent，它需要更深的 hack


## Fun Fact

这个 app icon 是我一时兴起从 Zapfino 的字形集里找的。朴素的 app 名配花哨的图标，这合理吗？
