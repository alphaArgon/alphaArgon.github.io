---
title: 关于仿色的杂谈
cover: images/dithering-cover.png
source: https://www.bilibili.com/read/cv14935113
---

仿色即通过若干种颜色交替出现以表现出其中间色；或者从其英文 dither 直译叫「抖动」。较早的时代因为技术限制，颜色位数十分低，难以表现出细腻的色彩，便会于是使用仿色的技术。当前可能很少听到这一概念。

最近再一次意识到仿色的概念是发现低亮度背景上，物体的阴影会出现严重的色彩断层：

{%- include figure.html
    caption="图 1　低亮度背景上的物体阴影<br>图右侧经提亮"
    img="images/dithering-shadow-banding.png"
    width=288 -%}

注意到底部阴影十分不均匀。最常用的 RGB 颜色表示，每个分量只有 8 bit，对于颜色较为接近的过渡仍捉襟见肘。

应用一定的防色处理，可以看见虽然增加了噪点，但断层现象缓解了许多。对于 DPI 越较高的设备，因其单个像素越不明显，其效果越好。

{%- include figure.html
    caption="图 2　低亮度背景上的物体阴影，作防色处理<br>图右侧经提亮"
    img="images/dithering-shadow-dithered.png"
    width=288 -%}

「防色」这一次较常见出现于 Photoshop 渐变工具的选项里。但我没有装 Photoshop，图 3 下半部分是 Safari 画出来的。 

{%- include figure.html
    caption="图 3　低亮度背景上的物体阴影，作防色处理<br>图中部经提亮"
    img="images/dithering-comparison-two.png"
    width=288 -%}

## 杂记

原本的阴影贴图是用 Sketch 做的，测试下了便注意到了这种断层现象。但是找了一圈，并没有发现（本机安装了的）程序会对阴影／模糊效果做防色处理。最后用 “某种卷积”——以该像素和其周边某一随机像素的颜色的加权平均作为新的颜色——实现了防色（确实是字面意义的「抖动」了）。

用 HTML Canvas (`createLinearGradient`) 绘制的时候还有一些特别其他的发现。图 4 是一些 2D 绘图渐变的对比：

{%- include figure.html
    caption="图 4　2D 渐变的对比"
    img="images/dithering-comparison-six.png"
    width=384 -%}

可以发现，Cocoa (`NSGradient`) 和 CoreAnimation (`CAGradientLayer`) 的效果一致，并且 Sketch 跟他们差不多，都是单色噪点；Safari 使用了彩色噪点；Chrome 为单色噪点，且分布规整；Firefox 没有使用任何防色处理，跟纵向逐条绘制的效果一致。

绘制由 #7F7F7F 到 #808080 的渐变，RGB 三个分量相加以 382.5 为界做二值化：

{%- include figure.html
    caption="图 5　二值化处理后的渐变"
    img="images/dithering-comparison-thresholded.png"
    width=384 -%}

参见 [Wikipedia](https://en.wikipedia.org/wiki/Dither)。
