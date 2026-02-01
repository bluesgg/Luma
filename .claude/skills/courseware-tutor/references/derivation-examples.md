# Mathematical Derivation Examples

This reference provides detailed examples of how to explain complex mathematical derivations step-by-step.

## Core Principle

**For multi-step derivations: Explain dependencies BEFORE using them.**

Each step should follow this pattern:
1. State what you're doing
2. Explain WHY you're doing it
3. Identify what properties/facts you're using
4. Show the operation
5. Explain what changed
6. Verify with concrete numbers if possible

---

## Example 1: Product Form of Likelihood

**Context:** Deriving the likelihood function for independent observations.

### Step-by-Step Explanation

**Setup:**
```
We want to write the likelihood L(θ|y₁,...,yₙ) for n independent observations.
```

**Step 0: Identify key assumption**
```
**Critical assumption:** The observations Y₁,...,Yₙ are independent.

What this means: Knowing the value of Y₁ tells us nothing about Y₂. 
Like flipping separate coins - one flip doesn't affect another.
```

**Step 1: Use independence property**
```
Because the observations are independent, we can use a fundamental property:

**Independence property:** For independent events A and B:
P(A and B) = P(A) × P(B)

This extends to n events:
P(A₁ and A₂ and ... and Aₙ) = P(A₁) × P(A₂) × ... × P(Aₙ)
```

**Step 2: Apply to likelihood**
```
The likelihood is the joint probability of observing all data:
L(θ|y₁,...,yₙ) = P(Y₁=y₁ and Y₂=y₂ and ... and Yₙ=yₙ | θ)

Using independence:
L(θ|y₁,...,yₙ) = P(Y₁=y₁|θ) × P(Y₂=y₂|θ) × ... × P(Yₙ=yₙ|θ)
```

**Step 3: Write in compact notation**
```
Each term P(Yᵢ=yᵢ|θ) is just f(yᵢ|θ), the probability density.

So we can write:
$$L(\theta|y_1,...,y_n) = \prod_{i=1}^n f(y_i|\theta)$$

The ∏ symbol means "multiply all terms from i=1 to i=n"
```

**Step 4: Verify with example**
```
Example: For n=3 observations
L(θ|y₁,y₂,y₃) = f(y₁|θ) × f(y₂|θ) × f(y₃|θ)

If each f(yᵢ|θ) = 0.3, then L = 0.3 × 0.3 × 0.3 = 0.027
```

### Why This Works

**If student asks: "Why can we write it as a product?"**

This means you didn't adequately explain the independence assumption first. Go back and emphasize:
1. Independence is given in the problem
2. Independence → joint probability = product
3. Therefore likelihood = product

---

## Example 2: Confidence Interval Derivation

**Context:** Deriving confidence interval from pivot quantity.

### Step-by-Step Explanation

**Setup:**
```
We have: $$-t_{\alpha/2} < \frac{\hat{\beta}_j - \beta_j}{SE} < t_{\alpha/2}$$

Goal: Isolate β_j in the middle to get the confidence interval.
```

**Step 1: Multiply all parts by SE**
```
**What we're doing:** Multiply all three parts of the inequality by SE

**Why:** We want to remove SE from the denominator

**Property we're using:** SE > 0 (standard errors are always positive)
→ Multiplying by positive number preserves inequality direction

**Operation:**
$$-t_{\alpha/2} \cdot SE < \hat{\beta}_j - \beta_j < t_{\alpha/2} \cdot SE$$

**What changed:** SE moved from denominator to being multiplied with t
```

**Step 2: Isolate β_j (first attempt)**
```
**What we're doing:** Subtract ĥat{β}_j from all parts

**Why:** We want β_j alone in the middle

**Operation:**
$$-t_{\alpha/2} \cdot SE - \hat{\beta}_j < -\beta_j < t_{\alpha/2} \cdot SE - \hat{\beta}_j$$

**What changed:** Now we have -β_j in the middle (negative!)
```

**Step 3: Remove negative sign**
```
**What we're doing:** Multiply all parts by -1

**Why:** We want +β_j, not -β_j

**CRITICAL PROPERTY:** Multiplying an inequality by a negative number 
REVERSES the inequality direction!

Think: If -5 < -3, then multiplying by -1 gives 5 > 3

**Operation:**
$$(-1)(-t_{\alpha/2} \cdot SE - \hat{\beta}_j) > (-1)(-\beta_j) > (-1)(t_{\alpha/2} \cdot SE - \hat{\beta}_j)$$

Simplifying:
$$t_{\alpha/2} \cdot SE + \hat{\beta}_j > \beta_j > -t_{\alpha/2} \cdot SE + \hat{\beta}_j$$

**What changed:** 
- Signs flipped
- Inequality directions reversed (< became >)
```

**Step 4: Rewrite in standard form**
```
**What we're doing:** Flip the inequality to put smaller value on left

**Why:** Standard convention is "lower bound < parameter < upper bound"

**Operation:**
$$\hat{\beta}_j - t_{\alpha/2} \cdot SE < \beta_j < \hat{\beta}_j + t_{\alpha/2} \cdot SE$$

**This is our confidence interval!**
```

**Step 5: Verify with numbers**
```
Example: 
- ĥat{β}_j = 3
- SE = 0.5  
- t_{α/2} = 2 (for some confidence level)

Starting inequality:
-2 < (3 - β_j)/0.5 < 2

Step 1 (multiply by 0.5):
-1 < 3 - β_j < 1

Step 2 (subtract 3):
-4 < -β_j < -2

Step 3 (multiply by -1, reverse inequalities):
4 > β_j > 2

Step 4 (rewrite):
2 < β_j < 4

So the 95% CI is [2, 4] ✓
```

### Common Student Questions

**Q: "Why does multiplying by -1 flip the inequality?"**

A: "Think about the number line. If -5 < -3 (negative five is left of negative three), then 5 > 3 (positive five is right of positive three). The relationship reverses when we flip signs."

**Q: "Why don't we just move terms around without worrying about signs?"**

A: "We need to track every operation carefully because inequalities are delicate - one wrong move and our interval could be completely backwards!"

---

## Example 3: Log-Likelihood Transformation

**Context:** Why we use log-likelihood instead of likelihood.

### Step-by-Step Explanation

**Step 0: Review what we have**
```
We have the likelihood function:
$$L(\theta|y) = \prod_{i=1}^n f(y_i|\theta)$$

For example, in Poisson: f(y|λ) = e^{-λ}λ^y / y!

So L(λ|y₁,...,yₙ) = [e^{-λ}λ^{y₁}/y₁!] × [e^{-λ}λ^{y₂}/y₂!] × ...
```

**Step 1: Identify the problem**
```
**Problem:** This involves:
- Products of many terms (hard to work with)
- Exponential functions (messy derivatives)
- Factorials in denominators (complicated)

Try taking the derivative - it's extremely messy!
```

**Step 2: Introduce the solution**
```
**Solution:** Take the natural logarithm

Define log-likelihood:
$$\ell(\theta|y) = \ln L(\theta|y)$$

Just the logarithm of the likelihood function.
```

**Step 3: Explain why this helps - Property 1**
```
**Property 1: Products become sums**

Logarithm property: ln(a × b) = ln(a) + ln(b)

So:
$$\ell(\theta|y) = \ln\left[\prod_{i=1}^n f(y_i|\theta)\right] = \sum_{i=1}^n \ln f(y_i|\theta)$$

Products → Sums (much easier to differentiate!)
```

**Step 4: Explain why this helps - Property 2**
```
**Property 2: Exponentials simplify**

Logarithm property: ln(e^x) = x

For Poisson example:
ln(e^{-λ}λ^y/y!) = ln(e^{-λ}) + ln(λ^y) - ln(y!)
                  = -λ + y·ln(λ) - ln(y!)

The exponential disappeared! Much simpler.
```

**Step 5: Address the key concern**
```
**Important:** Does using ln change where the maximum is?

**Answer:** No! 

**Why:** ln is a strictly increasing function
- If L(θ₁) > L(θ₂), then ln(L(θ₁)) > ln(L(θ₂))
- The ordering is preserved
- Maximum of L is at same place as maximum of ℓ
```

**Step 6: Concrete example**
```
Suppose we have two parameter values:
- L(θ₁) = 0.008
- L(θ₂) = 0.004

Then:
- ℓ(θ₁) = ln(0.008) ≈ -4.83
- ℓ(θ₂) = ln(0.004) ≈ -5.52

θ₁ has higher likelihood AND higher log-likelihood ✓
```

### Why This Sequencing Works

Notice the flow:
1. Review what we have ✓
2. Identify problem with current approach ✓
3. Introduce solution (with definition) ✓
4. Explain benefits ✓
5. Address concerns ✓
6. Verify with example ✓

No jumps. Each step builds on the previous.

---

## Example 4: Fisher Information

**Context:** Deriving the expected information from log-likelihood.

### Step-by-Step Explanation

**Step 0: What we have so far**
```
We know:
- Likelihood: L(θ|y)
- Log-likelihood: ℓ(θ|y) = ln L(θ|y)
- MLE: value of θ that maximizes ℓ(θ|y)
```

**Step 1: Recall what curvature tells us**
```
The second derivative ℓ''(θ) measures curvature:
- Large |ℓ''(θ)| → Sharp peak → Precise estimate
- Small |ℓ''(θ)| → Flat peak → Imprecise estimate

So -ℓ''(θ) (note the negative!) measures "information"
```

**Step 2: Identify the problem**
```
**Problem:** Different datasets give different ℓ''(θ)

Example: 
- Dataset 1: ℓ''(θ) = -25
- Dataset 2: ℓ''(θ) = -30
- Dataset 3: ℓ''(θ) = -20

Which one represents the "true" information about θ?
```

**Step 3: Build context for solution**
```
**Question:** How do we get a single measure that represents 
information across all possible datasets?

**Intuition:** Average them!

But what exactly do we average over?
```

**Step 4: Introduce expectation**
```
**Answer:** Take the expectation over all possible data

The expectation means: "average over the distribution of Y"

If we observed data many times, what would -ℓ''(θ) be on average?
```

**Step 5: Define Fisher Information**
```
Fisher Information:
$$I(\theta) = E_Y\left[-\frac{\partial^2 \ell(\theta|Y)}{\partial\theta^2}\right]$$

Breaking this down:
- ∂²ℓ/∂θ² is the second derivative (curvature)
- The negative makes it positive
- E_Y means "average over all possible values of Y"
```

**Step 6: Why this makes sense**
```
This is the "typical" curvature we'd see if we repeated the experiment.

High I(θ) → Typically get sharp peaks → Good estimates
Low I(θ) → Typically get flat peaks → Poor estimates
```

### Anti-Pattern to Avoid

❌ **Wrong sequencing:**
```
"The Fisher Information is the expectation of the negative second derivative."
[Student: "What? Why expectation? Expectation over what?"]
```

✅ **Correct sequencing:**
```
1. Review curvature concept ✓
2. Identify problem (different data → different curvature) ✓
3. Ask: how to get single measure? ✓
4. Answer: average! ✓
5. Specify: average over data distribution ✓
6. Define: this is called Fisher Information ✓
```

---

## General Patterns

### Pattern 1: Using Mathematical Properties

**Always state the property before using it:**

```
"We can split this into independent terms. Why? Because Y₁,...,Yₙ 
are independent, and for independent random variables, 
E[X + Y] = E[X] + E[Y]."
```

Not:
```
"So we get E[Y₁] + E[Y₂] + ..." [Student: "Why can we split it?"]
```

### Pattern 2: Algebraic Manipulations

**Explain the goal of each step:**

```
"Now we multiply both sides by σ². Why? To eliminate the denominator 
and isolate our parameter."
```

Not:
```
"Multiplying both sides by σ²..." [Student: "Why are we doing this?"]
```

### Pattern 3: Introducing New Concepts

**Always follow: Problem → Solution → Definition → Benefits**

```
1. "We have this complicated product..." (Problem)
2. "There's a trick to simplify this..." (Solution hint)
3. "Take the logarithm: ℓ = ln L" (Definition)
4. "This turns products into sums..." (Benefits)
```

Not:
```
"The log-likelihood is ln L. It's useful because..." [Too abrupt]
```

---

## Verification Strategies

### Numerical Verification

Whenever possible, plug in simple numbers:

```
"Let's verify: if x = 2 and y = 3, then...
Left side: 2(2) + 3 = 7
Right side: 2·2 + 3 = 7 ✓"
```

### Dimensional Analysis

Check units make sense:

```
"Notice: [force]/[mass] = [acceleration]
So F/m = a checks out dimensionally ✓"
```

### Limiting Cases

Test extreme values:

```
"What if n → ∞? Then 1/n → 0, which makes sense because 
with infinite data, uncertainty vanishes."
```

---

## Remember

**Every mathematical step needs:**
1. **What** are we doing?
2. **Why** are we doing it?
3. **What property** allows us to do it?
4. **What changed** after we did it?

**If you skip any of these, students get lost.**
