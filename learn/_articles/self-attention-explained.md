---
title: Self-Attention Explained with Real Numbers
slug: self-attention-explained
description: How does a transformer know that "bank" means a riverbank? Compute self-attention by hand on a three-word example, step by step, with numbers you can check. No advanced math needed.
date: 2026-10-14
hub: Transformers
session: Sessions 1–2
reading_time: 9 min read
---

The word **"bank"** can mean the side of a river or a place that holds your money. You know which one from the words around it:

- "I walked along the **bank** of the river."
- "I deposited money at the **bank** on Monday."

A language model has the same problem. Every word starts as a list of numbers, called an **embedding**, and "bank" gets **the same list of numbers in both sentences**. Somehow the model has to update that vector so it reflects the words around it.

That's what **self-attention** does. It's the core of every transformer: BERT, Vision Transformers and modern language models. And underneath, it's only three steps: **score, normalize, mix**.

In this article we'll compute it by hand on a tiny example. If you can add and multiply, you can follow every number.

## The example: three words, four numbers each

We'll use the phrase "bank of river". Each word gets a 4-number vector. Real models use hundreds of numbers learned from data; these are made-up toy values, small enough to check on paper:

| Word | Vector |
|---|---|
| bank | `[1, 0, 1, 0]` |
| of | `[0, 1, 0, 1]` |
| river | `[1, 1, 0, 0]` |

**The goal:** produce three *new* vectors, one per word, where each one has absorbed some information from the others. We'd hope "bank" and "river" influence each other, and "of" mostly stays itself.

## Step 1: Score (how similar is each pair of words?)

To measure how similar two vectors are, we use the **dot product**: multiply the numbers position by position, then add them up.

- bank · bank = 1×1 + 0×0 + 1×1 + 0×0 = **2**
- bank · of = 1×0 + 0×1 + 1×0 + 0×1 = **0**
- bank · river = 1×1 + 0×1 + 1×0 + 0×0 = **1**

{{anim:dot}}

So "bank" is most similar to itself, then to "river", and has nothing in common with "of". Doing the same for every pair gives a 3×3 grid of **scores**:

| | bank | of | river |
|---|---|---|---|
| **bank** | 2 | 0 | 1 |
| **of** | 0 | 2 | 1 |
| **river** | 1 | 1 | 2 |

Each row answers one question: *how similar is this word to every word in the sentence?*

## Step 2: Normalize (turn scores into percentages)

Raw scores can be any size, and they don't add up to anything in particular. We want **focus percentages**: positive numbers that add up to 1. The function that does this is called **softmax**:

1. Raise *e* (about 2.718) to the power of each score.
2. Add the results.
3. Divide each result by that total.

For the "bank" row, with scores 2, 0, 1:

| | Score | *e*<sup>score</sup> | ÷ 11.107 |
|---|---|---|---|
| bank | 2 | 7.389 | **0.665** |
| of | 0 | 1.000 | **0.090** |
| river | 1 | 2.718 | **0.245** |
| **Sum** | | 11.107 | **1.000** |

{{anim:softmax}}

So "bank" puts **66.5%** of its focus on itself, **24.5%** on "river" and **9%** on "of". Softmax never gives exactly zero, and it widens the gap between high and low scores.

Doing the same for every row gives the **focus matrix**, usually called **A**:

| Focus of… | on bank | on of | on river |
|---|---|---|---|
| **bank** | 0.665 | 0.090 | 0.245 |
| **of** | 0.090 | 0.665 | 0.245 |
| **river** | 0.212 | 0.212 | 0.576 |

Every row adds up to 1. Every word focuses most on itself, but the off-diagonal numbers aren't zero: context is starting to flow between related words.

## Step 3: Mix (blend the vectors using those percentages)

Each row of A is a **recipe** for a new vector. For "bank" it says: take 0.665 of "bank", plus 0.090 of "of", plus 0.245 of "river", and add them up.

```
  0.665 × [1, 0, 1, 0]      (bank)
+ 0.090 × [0, 1, 0, 1]      (of)
+ 0.245 × [1, 1, 0, 0]      (river)
= [0.910, 0.335, 0.665, 0.090]
```

{{anim:mix}}

The original "bank" was `[1, 0, 1, 0]`. Positions 2 and 4 were zero; now they're 0.335 and 0.090. **That's information from "river" and "of" flowing into "bank."** The new vector is no longer generic: it's specific to *this* sentence.

Doing the same for all three words:

| Word | Before | After self-attention |
|---|---|---|
| bank | `[1, 0, 1, 0]` | `[0.910, 0.335, 0.665, 0.090]` |
| of | `[0, 1, 0, 1]` | `[0.335, 0.910, 0.090, 0.665]` |
| river | `[1, 1, 0, 0]` | `[0.788, 0.788, 0.212, 0.212]` |

"bank" absorbed more from "river" than from "of", because "river" had the higher score. "river" absorbed equally from "bank" and "of", because its two scores were tied. That's exactly what we hoped for.

## The same thing, all at once

We did that one word at a time. Stack the three vectors into a matrix **X** (3 rows, 4 columns), and the whole calculation becomes one line:

```
SelfAttention(X) = softmax(X · Xᵀ) · X
```

- **Score:** `S = X · Xᵀ` computes all nine dot products in one multiplication.
- **Normalize:** `A = softmax(S)`, applied row by row.
- **Mix:** `Y = A · X` blends every word at once.

Two matrix multiplications and one softmax. And it gives exactly the numbers we just computed by hand.

Notice that the output has **the same shape as the input**: 3 words with 4 numbers each go in, 3 words with 4 numbers each come out. That's why transformers can stack attention layers on top of each other, each one adding more context.

## Why is it called *self*-attention?

Count the X's in the formula: there are three, and they play different roles.

- The first X **asks**: "how similar am I to everyone?"
- The second X (transposed) **answers**: "here are my features for comparison."
- The third X is the **content** being blended.

All three are the same sentence, so the sentence is attending to *itself*.

## The catch, and what comes next

In everything above, the focus percentages were completely fixed by the starting vectors. There was nothing the model could *learn*. But different tasks need different kinds of focus: sometimes "bank" should look at "river" for meaning, and sometimes at "of" for grammar.

The fix is to give each of those three roles its own learnable transformation. These are the famous **query, key and value** matrices, and adding them gives the attention used in real transformers:

```
Attention(Q, K, V) = softmax(Q · Kᵀ / √d) · V
```

Same three steps, score, normalize, mix, just on transformed versions of the words.

## Try it yourself

- **Interactive demo:** click any word in "bank of river" and watch these exact numbers update live → [latentquest.ai](/#demo)
- **Code:** the same calculation in NumPy and PyTorch, with tests that check every number in this article → [self-attention-from-scratch on GitHub](https://github.com/seyedvahidmirnezami/self-attention-from-scratch)

Here's the whole calculation in a few lines of NumPy:

```python
import numpy as np

X = np.array([[1, 0, 1, 0],   # bank
              [0, 1, 0, 1],   # of
              [1, 1, 0, 0]],  # river
             dtype=float)

S = X @ X.T                                         # 1. score
A = np.exp(S) / np.exp(S).sum(axis=1, keepdims=True)  # 2. normalize (softmax)
Y = A @ X                                           # 3. mix

print(A.round(3))   # bank row: [0.665 0.09  0.245]
print(Y.round(3))   # new bank: [0.91  0.335 0.665 0.09 ]
```

## Go further

This article covers Sessions 1–2 of our course **Master Transformers from Scratch: BERT, ViT & AI Search**. The course continues with query, key and value, multi-head attention, the full encoder block and positional encoding, then builds BERT in PyTorch and applies it to text classification, named-entity recognition, Vision Transformers and AI-powered search.
