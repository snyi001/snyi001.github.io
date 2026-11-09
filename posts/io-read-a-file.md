---
title: 不装任何库，读一个文件
date: 2026-09-06
summary: 从 open 到 read 到 close，中间那层「库」到底做了什么
category: IO小笔记
---

# 不装任何库，读一个文件

写 Python 的时候我们 `open()` 一下就好了。但 `open` 底下到底发生了什么？我把它拆到只剩系统调用。

## 三个系统调用

```
fd = open("a.txt", O_RDONLY)   # 拿到一个文件描述符
n  = read(fd, buf, 4096)       # 读进缓冲区，返回真正读到的字节数
close(fd)                      # 还回去
```

就这么三步。语言里的「文件对象」只是把这三步包起来，再替你处理缓冲、编码和错误。

## 几个容易被忽略的点

- `read` 返回 **0** 才代表读完，返回比请求少是正常的（管道、网络、慢磁盘都可能）
- 文件描述符是**小整数**，0/1/2 分别是 stdin/stdout/stderr，所以打开的文件通常从 3 开始
- 忘了 `close` 的后果不是内存泄漏，是**描述符泄漏**——进程有上限，用完了就打不开新文件

## 一个最小的实现

```python
import os
fd = os.open("a.txt", os.O_RDONLY)
try:
    while True:
        chunk = os.read(fd, 4096)
        if not chunk:
            break
        print(chunk.decode("utf-8", "replace"), end="")
finally:
    os.close(fd)
```

`finally` 那行不是洁癖——异常路径也要还描述符。

## 我为什么记这个

因为**缓冲区溢出、文件泄漏、慢查询**，这些问题最后都能追到「谁打开了什么、什么时候关」上。把这一层看清楚，看别人的代码会快很多。

> 库是别人替你做的决定。知道你放弃了哪些决定，才算会用它。
