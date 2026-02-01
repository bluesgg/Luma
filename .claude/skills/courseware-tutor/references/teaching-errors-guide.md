# Teaching Errors and Fixes: Real Session Examples

This reference provides concrete examples from actual tutoring sessions showing common teaching errors and their fixes.

## Error Category 1: LaTeX Formula Mistakes

### Example 1: Missing Closing Delimiter

**Student feedback:** "这里的公式格式为什么是这样的。显示有误吧"

**Error:**
```
$$\hat{\lambda} = \bar{y} = \frac{y_1 + \cdots + y_n}{n}
```

**What went wrong:** Missing closing `$$`

**Correct:**
```
$$\hat{\lambda} = \bar{y} = \frac{y_1 + \cdots + y_n}{n}$$
```

**Prevention:** Count delimiters before every send. Opening `$$` must equal closing `$$`.

---

## Error Category 2: Wrong Sequencing - "Why" Before "What"

### Example 2: Explaining Usage Before Definition

**Student feedback:** "你还没讲对数似然是什么呢，为什么突然说为什么用对数似然？"

**Error sequence:**
```
1. Likelihood function ✓
2. Why use log-likelihood? ❌ (student doesn't know what it is yet!)
3. What is log-likelihood? (too late)
```

**What went wrong:** Explained motivation before providing definition.

**Correct sequence:**
```
1. Likelihood function ✓
2. What is log-likelihood? 
   "The log-likelihood is simply ℓ(θ|y) = ln L(θ|y)"
3. Why use log-likelihood?
   "Now let me explain why we take the logarithm..."
```

**Teaching principle:** Always DEFINE before MOTIVATING.

---

## Error Category 3: Sudden Topic Jumps

### Example 3: Introducing Expectation Without Context

**Student feedback:** "我就是不懂你为什么突然跳出来说这个。好像和上下文并无联系"

**Error flow:**
```
Explaining second derivatives (curvature)
↓
❌ SUDDEN JUMP
"The expectation is taken over data distribution"
```

**What went wrong:** No bridge connecting second derivatives to expectation.

**Correct flow:**
```
Explaining second derivatives (curvature) ✓
↓ (BUILD CONTEXT)
"But there's a problem: different data give different second derivatives"
↓ (IDENTIFY NEED)
"So which second derivative represents 'information'?"
↓ (PROVIDE SOLUTION)
"Fisher's answer: look at the average across all possible data"
↓ (INTRODUCE CONCEPT)
"This average is called the expectation over data distribution"
```

**Teaching principle:** Every new concept needs a PROBLEM → SOLUTION bridge.

---

## Error Category 4: Undefined Terminology

### Example 4: Using "Scalar" Without Explanation

**Student question:** "什么是标量"

**Error:** Used term "scalar" assuming student knew it.

**What went wrong:** Technical term introduced without definition.

**Correct approach:**
```
Option A (define inline):
"This result is a scalar - just a single number, like 5 or -3.14"

Option B (use simple language):
"This result is just a single number (not a vector or matrix)"

Option C (define when first needed):
Before first use: "A scalar means a single number, 
as opposed to a vector (list of numbers) or matrix (table of numbers)"
```

**Teaching principle:** Define technical terms IMMEDIATELY when first used.

---

## Error Category 5: Missing Dependencies

### Example 5: Using Independence Without Stating It

**Student question:** "为什么 L(λ|y₁,...,yₙ) = ∏ f(yᵢ|λ)?"

**Error:** Wrote the product form without explaining independence assumption.

**What went wrong:** Used a property (independence → product) without stating it.

**Correct approach:**
```
"We can write the likelihood as a product. Here's why:

**Key assumption:** Y₁,...,Yₙ are independent.

**What independence means:** 
Knowing Y₁ doesn't tell us anything about Y₂.
Like separate coin flips.

**Mathematical consequence:**
For independent events: P(A and B) = P(A) × P(B)

**Applied to our case:**
Since Y₁,...,Yₙ are independent:
L(θ|y₁,...,yₙ) = f(y₁|θ) × f(y₂|θ) × ⋯ = ∏ f(yᵢ|θ)
"
```

**Teaching principle:** State assumptions BEFORE using their consequences.

---

## Pattern Recognition: When Students Signal Errors

### Signal Phrases and Their Meanings

| Student says | Underlying issue | Fix |
|-------------|------------------|-----|
| "为什么突然..." | Missing context bridge | Add problem → solution transition |
| "你还没讲..." | Wrong sequence | Define before using |
| "什么是..." | Undefined term | Provide immediate simple definition |
| "这和之前有什么关系?" | Topic jump | Explicitly connect to prior content |
| "公式有误" | LaTeX error | Check syntax immediately |

### The Meta-Lesson

**Student confusion is almost always caused by:**
1. Missing information (didn't define/explain)
2. Wrong order (explained Y before X, but Y depends on X)  
3. Missing bridges (jumped topics without transition)
4. Technical errors (LaTeX, notation mistakes)

**It's rarely because the student "isn't getting it" - it's because the teacher skipped a logical step.**

---

## Best Practices Checklist

Before explaining any concept:

- [ ] Have I defined all terms I'm about to use?
- [ ] Have I explained why the student needs this concept?
- [ ] Is there a clear connection to what we just discussed?
- [ ] Have I stated all assumptions/properties I'll use?
- [ ] Have I double-checked my LaTeX syntax?

If student asks "why suddenly X?" → You failed the checklist. Back up and fill the gap.

---

## Example of Excellent Sequencing

**Topic: Introducing Log-Likelihood**

```
✓ Step 1: Review what we have
"We just learned about the likelihood function L(θ|y)"

✓ Step 2: Identify a challenge
"But there's a practical problem: for GLMs, L(θ|y) involves 
complicated products of exponential functions"

✓ Step 3: Preview the solution
"There's a mathematical trick that makes this much easier"

✓ Step 4: Define the concept
"This trick is the log-likelihood: ℓ(θ|y) = ln L(θ|y)
It's simply the natural logarithm of the likelihood"

✓ Step 5: Explain the benefits
"Why does this help?
1. Products become sums: ln(a×b) = ln(a) + ln(b)
2. Exponentials simplify: ln(eˣ) = x
3. It doesn't change where the maximum is"

✓ Step 6: Verify understanding
"Does that make sense why we'd want to use the logarithm?"
```

**Why this works:**
- Builds on prior knowledge (likelihood)
- Motivates need (products are complicated)  
- Defines clearly (ℓ = ln L)
- Explains benefits (why it helps)
- Checks understanding

No sudden jumps. No undefined terms. Clear logical flow.
