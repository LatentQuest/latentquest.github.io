---
title: Self-Attention Explained with Real Numbers
slug: self-attention-explained
description: How does a transformer know that "bank" means a riverbank? Compute self-attention by hand on a three-word example, step by step, with numbers you can check. No advanced math needed.
date: 2026-10-14
hub: Transformers
session: Sessions 1–2
reading_time: 12 min read
---

> **In 30 seconds**
> - Every word in a sentence starts as a list of numbers, and "bank" gets the same list whether you mean a riverbank or a money bank.
> - **Self-attention** lets each word borrow information from the other words in the same sentence, so "bank" next to "river" ends up different from "bank" next to "money".
> - It takes three steps: **score** (how similar is each pair of words?), **normalize** (turn the scores into percentages), **mix** (blend the words using those percentages).
> - Below, we compute every number by hand. If you can add and multiply, you can follow along.

## The problem: words need context

The word **"bank"** can mean the side of a river or a place that holds your money. You know which one from the words around it:

- "I walked along the **bank** of the river."
- "I deposited money at the **bank** on Monday."

A computer can't work with words directly, so a language model turns every word into a **vector**: simply a list of numbers that describes the word. (This list is also called an **embedding**.) The problem is that "bank" gets **the same list of numbers in both sentences**. The model needs a way to update that list so it reflects the words around it.

That's what **self-attention** does. It's the core of every transformer, the architecture behind BERT, Vision Transformers and modern language models. And underneath, it's only three steps: **score, normalize, mix**.

## The example: three words, four numbers each

We'll use the phrase "bank of river". Each word gets a vector of 4 numbers. Real models use hundreds of numbers that they learn from data; these are made-up toy values, small enough to check on paper:

| Word | Vector |
|---|---|
| bank | `[1, 0, 1, 0]` |
| of | `[0, 1, 0, 1]` |
| river | `[1, 1, 0, 0]` |

You can think of each position as a feature the word may or may not have. "bank" and "river" share the first feature; "of" shares nothing with "bank".

**The goal:** produce three *new* vectors, one per word, where each one has absorbed some information from the others. We'd hope "bank" and "river" influence each other, and "of" mostly stays itself.

## Step 1: Score (how similar is each pair of words?)

To measure how similar two vectors are, we use the **dot product**: multiply the numbers position by position, then add them up.

- bank · bank = 1×1 + 0×0 + 1×1 + 0×0 = **2**
- bank · of = 1×0 + 0×1 + 1×0 + 0×1 = **0**
- bank · river = 1×1 + 0×1 + 1×0 + 0×0 = **1**

Why does this measure similarity? A position only adds to the total when **both** words have a value there. The more features two words share, the bigger the score. "bank" and "river" share one feature, so they score 1; "bank" and "of" share none, so they score 0.

{{anim:dot}}

Doing the same for every pair gives a 3×3 grid of **scores**:

| | bank | of | river |
|---|---|---|---|
| **bank** | 2 | 0 | 1 |
| **of** | 0 | 2 | 1 |
| **river** | 1 | 1 | 2 |

Read it row by row. Each row answers one question: *how similar is this word to every word in the sentence?*

## Step 2: Normalize (turn scores into percentages)

Raw scores can be any size, and they don't add up to anything in particular. We want **focus percentages**: positive numbers that add up to 1 (that is, 100%). The standard tool for this is called **softmax**:

1. Raise *e* to the power of each score.
2. Add the results.
3. Divide each result by that total.

Don't let *e* worry you: it's just a fixed number, about 2.718, like π is about 3.14. A calculator or one line of code does this step for you.

For the "bank" row, with scores 2, 0, 1:

| | Score | *e*<sup>score</sup> | ÷ 11.107 |
|---|---|---|---|
| bank | 2 | 7.389 | **0.665** |
| of | 0 | 1.000 | **0.090** |
| river | 1 | 2.718 | **0.245** |
| **Sum** | | 11.107 | **1.000** |

{{anim:softmax}}

So "bank" puts **66.5%** of its focus on itself, **24.5%** on "river" and **9%** on "of".

**Why not just divide each score by the total?** That would give 0.67, 0 and 0.33. Softmax is better for two reasons: it always gives positive numbers, even when scores are negative (which happens in real models), and it never cuts a word off completely. "of" still gets a small 9%. It also widens the gap between high and low scores, so the most similar words stand out.

Doing the same for every row gives the **focus matrix**, usually called **A** (a matrix is simply a table of numbers):

| Focus of… | on bank | on of | on river |
|---|---|---|---|
| **bank** | 0.665 | 0.090 | 0.245 |
| **of** | 0.090 | 0.665 | 0.245 |
| **river** | 0.212 | 0.212 | 0.576 |

Every row adds up to 1. Every word focuses most on itself, but the other numbers aren't zero: context is starting to flow between related words.

## Step 3: Mix (blend the vectors using those percentages)

Each row of A is a **recipe** for a new vector. For "bank" it says: take 66.5% of "bank", plus 9% of "of", plus 24.5% of "river", and add them up, position by position.

```
  0.665 × [1, 0, 1, 0]      (bank)
+ 0.090 × [0, 1, 0, 1]      (of)
+ 0.245 × [1, 1, 0, 0]      (river)
= [0.910, 0.335, 0.665, 0.090]
```

{{anim:mix}}

The original "bank" was `[1, 0, 1, 0]`. Positions 2 and 4 were zero; now they're 0.335 and 0.090. **That's information from "river" and "of" flowing into "bank."** The new vector is no longer generic: it's specific to *this* sentence. In a sentence about money, the same steps would pull "bank" toward the financial meaning instead.

Doing the same for all three words:

| Word | Before | After self-attention |
|---|---|---|
| bank | `[1, 0, 1, 0]` | `[0.910, 0.335, 0.665, 0.090]` |
| of | `[0, 1, 0, 1]` | `[0.335, 0.910, 0.090, 0.665]` |
| river | `[1, 1, 0, 0]` | `[0.788, 0.788, 0.212, 0.212]` |

"bank" absorbed more from "river" than from "of", because "river" had the higher score. "river" absorbed equally from "bank" and "of", because its two scores were tied. That's exactly what we hoped for.

## The same thing, all at once

We did that one word at a time. Computers do it for every word at once, using tables of numbers called **matrices**.

Stack the three word vectors into one table **X**, with one row per word (3 rows, 4 columns). **Xᵀ**, read "X transpose", is the same table flipped so its rows become columns. With those, the whole calculation fits on one line:

```
SelfAttention(X) = softmax(X · Xᵀ) · X
```

- **Score:** `S = X · Xᵀ` computes all nine dot products in one go.
- **Normalize:** `A = softmax(S)`, applied row by row.
- **Mix:** `Y = A · X` blends every word at once.

It gives exactly the numbers we computed by hand. The matrix version isn't a different idea; it's the same steps done for every word simultaneously.

Notice that the output has **the same shape as the input**: 3 words with 4 numbers each go in, 3 words with 4 numbers each come out. That's why transformers can stack attention layers on top of each other, each one adding more context.

## Why is it called *self*-attention?

Count the X's in the formula: there are three, and they play different roles.

- The first X **asks**: "how similar am I to everyone?"
- The second X (transposed) **answers**: "here are my features for comparison."
- The third X is the **content** being blended.

All three come from the same sentence, so the sentence is paying attention to *itself*.

## What self-attention can't do (yet)

**It ignores word order.** The dot product doesn't care where a word sits. "dog bites man" and "man bites dog" contain the same words, so they get exactly the same scores. Transformers fix this by adding **positional encoding**: a small pattern added to each word's vector that marks its position. ([See an experiment where this makes the difference between 50% and 100% accuracy.](https://github.com/seyedvahidmirnezami/transformer-encoder-pytorch))

**It can't learn.** In everything above, the focus percentages were completely fixed by the starting vectors. But different tasks need different kinds of focus: sometimes "bank" should look at "river" for meaning, and sometimes at "of" for grammar. The fix is to give each of the three roles its own learnable transformation. These are the famous **query, key and value** matrices, and adding them gives the attention used in real transformers:

```
Attention(Q, K, V) = softmax(Q · Kᵀ / √d) · V
```

Same three steps, score, normalize, mix, just on transformed versions of the words. The **√d** (the square root of the vector length) shrinks the scores slightly, because longer vectors produce bigger dot products, and very large scores make softmax put almost all the focus on a single word.

> **For experienced readers: what changes in a real transformer**
> - **Embeddings** are learned, with hundreds of dimensions (768 in BERT-base), not hand-picked 0s and 1s.
> - **Q, K and V** are separate learned projections of X, and scores are scaled by √d<sub>k</sub>.
> - **Multi-head attention** runs several attention operations in parallel (12 heads in BERT-base), each free to learn a different kind of relationship, then concatenates them.
> - **Masks** stop attention to padding tokens, and in text generators like GPT, to future tokens.
> - **Cost** grows with the square of the sequence length, because the score matrix is n × n.
> - Attention sits inside an **encoder block** with residual connections, layer normalization and a feed-forward network, stacked many times.

## Try it yourself

- **Interactive demo:** click any word in "bank of river" and watch these exact numbers update live → [latentquest.ai](/#demo)
- **Code:** the same calculation in NumPy and PyTorch, with tests that check every number in this article → [self-attention-from-scratch on GitHub](https://github.com/seyedvahidmirnezami/self-attention-from-scratch)

Here's the whole calculation in a few lines of NumPy (a Python library for working with tables of numbers):

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

## Recap

- **Vector (embedding):** a list of numbers that represents a word.
- **Dot product:** multiply position by position and add; a bigger result means more similar.
- **Softmax:** turns any list of scores into positive percentages that add up to 100%.
- **Self-attention:** score every pair of words, turn the scores into percentages, and blend the words with them, so each word carries context from the whole sentence.
- **Formula:** `softmax(X · Xᵀ) · X`; real transformers add query, key and value, √d scaling, multiple heads and positional encoding.

## Go further

This article covers Sessions 1–2 of our course **Master Transformers from Scratch: BERT, ViT & AI Search**. The course continues with query, key and value, multi-head attention, the full encoder block and positional encoding, then builds BERT in PyTorch and applies it to text classification, named-entity recognition, Vision Transformers and AI-powered search.
