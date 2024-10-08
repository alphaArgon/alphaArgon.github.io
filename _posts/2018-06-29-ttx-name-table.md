---
title: ttx 和 SFNT 字体 'name' 表
source: https://zhuanlan.zhihu.com/p/38679788
---

> 2024/10/08 注：原文不严谨之处并没有修改。如果你对这篇文章有任何疑问，欢迎提出。


一般来说，SFNT 字体由多张表 (tables) 描述，如负责字体名称的 'name' 表，字形曲线的 'CFF ' (PS) 和 'glyf' (TT) 表等。ttx 隶属于开源项目 [fontTools](https://github.com/fonttools/fonttools)，亦被收录于 [Adobe Font Development Kit for OpenType](https://www.adobe.com/devnet/opentype/afdko.html) (AFDKO, FDK)，用以提取字体的信息表。

本文将简要介绍 'name' 表。

参见

- [Naming table specification - Typography](https://docs.microsoft.com/en-us/typography/opentype/spec/name)
- [Font Names Table](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6name.html)


## 下载、安装并运行 ttx

访问 [GitHub](https://github.com/fonttools/fonttools/releases) 或 [Adobe](https://www.adobe.com/devnet/opentype/afdko/eula.html) 并根据自己的操作系统选择下载 AFDKO。依照提示执行步骤，完成后，在 Terminal (macOS 和 Linux) 或命令提示符/PowerShell (Windows) 中键入

```sh
ttx -h
```

并按下 return/enter。如果安装正确，命令行将会显示类似如下内容：

```sh
usage: ttx [options] inputfile1 [... inputfileN]

    TTX -- From OpenType To XML And Back

    If an input file is a TrueType or OpenType font file, it will be
       dumped to an TTX file (an XML-based text format).
    If an input file is a TTX file, it will be compiled to a TrueType
       or OpenType font file.

    Output files are created so they are unique: an existing file is
       never overwritten.
...

    --with-zopfli Use Zopfli instead of Zlib to compress WOFF. The Python
      extension is available at https://pypi.python.org/pypi/zopfli
```

## 导出字体文件的 'name' 表

在命令行中执行

```sh
ttx -t 'name' <file>
```

其中 `<file>` 代表字体文件路径，可在输入完成 `ttx -t 'name'`（注意 ' 后还需一个空格）直接将字体文件拖入命令行。 

### 命令解释

`-t`：只提取其后附加的表的内容，当表的代号为 4 个字母时，可省去引号；一般情况下亦可以键入双引号。`-t 'name'` 表示提取 `'name'` 表。如果需要提取多个表，请重复键入 `-t` 参数，例如

```sh
ttx -t 'name' -t 'glyf'
```

如果是 .otc 或 .ttc 文件，使用 `-y` 参数：

`-y`：选择字体集合中的特定字体，从 0 开始计数。

以 Roboto Regular (Roboto-Regular.ttf) 为例，执行上述命令后，在原目录中会生出与该字体文件同主干名的 .ttx 文件，在本例中即 Roboto-Regular.ttx。打开该 .ttx 文件。
文件内容大致如下：

```xml
 1  <?xml version="1.0" encoding="UTF-8"?>
 2  <ttFont sfntVersion="\x00\x01\x00\x00" ttLibVersion="3.9">
 3
 4    <name>
 5      <namerecord nameID="0" platformID="3" platEncID="1" langID="0x409">
 6        Copyright 2011 Google Inc. All Rights Reserved.
 7      </namerecord>
 8      <namerecord nameID="1" platformID="3" platEncID="1" langID="0x409">
 9        Roboto
10      </namerecord>    
         ...
47    </name>
48
49  </ttFont>
```


.ttx 档案实质为 XML，其内容第 1 行用以标记 XML，第 2 行和第 47 行标记 ttx 信息。

第 4 行和第 47 行（`<name>` 与 `</name>`）表示这两行之间的为 'name' 表信息。

## 名称记录

第 5 行到第 7 行、第 8 行到第 10 行标记了一条名称记录（name record，权且这样翻译）。

第 6 行和第 9 行为该名称纪录的内容。

第 5 行和第 7 行标记了这条名称纪录的

- 名称识别符, name identifier code, nameID
- 平台识别符, platform identifier code, platformID
- 平台详明识别符, (platform-)specific identifier code, platEncID/encodingID/platformSpecificID
- 语言识别符, language identifier code, langID/languageID

有时候还会出现的 length 和 offset，但是这里不需要管它。

## 平台识别符

值可以为 0 到 4。

> 0　Unicode 平台\
> 1　Macintosh 平台\
> 2　ISO 标准，目前已弃用\
> 3　Windows 平台\
> 4　自定义平台

大多数情况 platformID 只会使用 1 和 3，在这种情况下 macOS 下优先识别 ID 为 1 的纪录，其次是 ID 为 3。Windows 只识别 ID 为 3 的纪录。故一些情况下可以省略 ID 为 0 的名称纪录。

## 平台详明识别符

**platformID 为 0 时**，platEncID 可以有如下定义的值

> 0　Unicode 1.0 semantics (默认 semantics)\
> 1　Unicode 1.1 semantics\
> 2　ISO 10646 1993 semantics，目前已弃用\
> 3　Unicode 2.0 或后续 semantics，仅限基本文平面（U+0000–U+FFFF）\
> 4　Unicode 2.0 或后续 semantics，不限制编码平面\
> 5　Unicode 变体序列。仅在 'cmap' 中被使用，但本文顺带說明

出于历史原因，部分字符（主要是谚文相关）编码在 Unicode 迭代中被移动。

这里根据需要选择 3 或 4。

**platformID 为 1 时**，platEncID 可以有如下定义的值

> 0　拉丁字符\
> 1　日文\
> 2　繁体中文\
> 3　韩文\
> 4　阿拉伯文\
> 5　希伯来文\
> 6　希腊文\
> 7　俄文\
> 8　RSymbol\
> 9　天城文\
> 10　锡克教文\
> 11　古吉拉特文\
> 12　奥利雅文\
> 13　孟加拉文\
> 14　坦米尔文\
> 15　泰卢固文\
> 16　卡纳达文\
> 17　马来亚拉姆文\
> 18　僧伽罗\
> 19　缅甸文\
> 20　高棉文\
> 21　泰文\
> 22　老挝文\
> 23　格鲁吉亚文\
> 24　亚美尼亚文\
> 25　简体中文\
> 26　藏文\
> 27　蒙古文\
> 28　古闪文\
> 29　斯拉夫文\
> 30　越南文\
> 31　信德文\
> 32　未定义

应该将该条 platformID 为 1 的名称记录的 platEncID 设定为该记录对应的编号。

**platformID 为 3 时**，platEncID 可以有如下定义的值

> 0　供符号字体用\
> 1　Unicode 基本文平面 (UCS-2)\
> 2　ShiftJIS\
> 3　PRC\
> 4　Big5\
> 5　Wansung\
> 6　Johab\
> 7–9　未定义\
> 10　Unicode UCS-4

这里一般选择 1。

## 语言识别符

用以标记这条名称记录的语言。

**platformID 为 0 时**，似乎没有 langID。

**platformID 为 1 时**，常见的有

> 0x0　英文\
> 0xb　日文\
> 0x13　繁体中文\
> 0x21　简体中文

限于篇幅，不将所有语言列出。详细信息可访问 [Naming table specification](https://docs.microsoft.com/en-us/typography/opentype/spec/name#windows-platform-specific-encoding-and-language-ids-platform-id-3)。网页中的值以十进制表示，故没有 `0x` 的前缀，需要额外转换。

**platformID 为 3 时**，常见的有

> 0x404　繁体中文（台湾）\
> 0x804　简体中文（大陆）\
> 0xC04　简体中文（香港）\
> 0x409　英文（美国）\
> 0x809　英文（英国）\
> 0x411　日文

详细信息可访问 [Naming table specification](https://docs.microsoft.com/en-us/typography/opentype/spec/name#windows-platform-specific-encoding-and-language-ids-platform-id-3)。

## 名称标识符

用以标记这条纪录的内容是字体的家族、子族、版权等。nameID 可以为 0 到 327670。一般的字型档只包括 nameID 为 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17。

0 到 25 的 nameID 已经被预定义，分别为

> 0　版权信息\
> 1　家族名\
> 2　子族名（样式名）\
> 3　唯一标识符\
> 4　全名（包括家族名和子族名）\
> 5　版本号\
> 6　PostScript 名（PS 名）。简单来说，请只使用字母、数字、下划线和连字符，不要使用空格和其他符号\
> 7　商标说明\
> 8　制造商名\
> 9　设计者名\
> 10　字体描述，可以包括修订信息、使用建议和特性等\
> 11　字体供应商 URL\
> 12　设计者 URL\
> 13　授权许可描述\
> 14　授权许可信息 URL\
> 15　保留（未定义）\
> 16　首选家族名\
> 17　首选子族名\
> 18　相容性全名（仅用于 Macintosh 平台）\
> 19　示例文本\
> 20　PostScript CID findfont 名称\
> 21　WWS 家族名\
> 22　WWS 子族名\
> 23　浅色调色板\
> 24　深色调色板\
> 25　可变字体的首位名称纪录 nameID\
> 26 到 255 为以后 OpenType 规范保留\
> 256 到 2767 用于描述可变字体的子样式名、OpenType 特性，如样式集名称

## macOS 和 Windows 下的 'name' 表的区别

参见 [Windows 在安装字体时是如何识别字体和字族的？](https://www.zhihu.com/question/58705102/answer/158508334)

## macOS 惯例

nameID 为 1 和 2 的内容分别为意识上的家族名和子族名，例如有字体叫 SampleFont Condensed Semibold Italic，它这两项应为

```
家族名：SampleFont Condensed
子族名：Semibold Italic
```

或者

```
家族名：SampleFont
子族名：Condensed Semibold Italic
```

更推荐前者。macOS 的惯例下，可以没有 platformID 为 1 的首选家族名和首选子族名。

## Windows 惯例

1\. 如果它的子族为四大基本样式（标准、斜体、粗体、粗斜体），nameID 为 1 和 2 的内容也为意识上的家族名和子族名，并且不需要首选家族名和首选子族名。
对于其他的子族，例如 SampleFont Condensed Semibold Italic，它的这两个应该为

```
家族名：SampleFont Condensed Semibold
子族名：Italic
```

2\. 如果字族相同，Windows 最多只能识别子族名为 Regular, Italic, Bold, Bold Italic 的四个字型档。另一种写法可以是

```
家族名：SampleFont Condensed Semibold
子族名：Condensed Semibold Italic
```

但并不推荐。若要能在控制面板的「字体」中正确归为字族，则应添加首选家族名和首选子族名。这两者的写法同 macOS 的家族名和子族名。

## 结尾

本人对此有所兴趣，写这篇文章只是为相同的爱好者提供一个入门级的指导。本文有所纰漏，仍望各位读者大胆指出。感谢。
