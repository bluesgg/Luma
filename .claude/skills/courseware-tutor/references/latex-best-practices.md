# LaTeX Formula Best Practices

This reference provides comprehensive LaTeX formatting guidelines for mathematical content in teaching sessions.

## Critical Requirements

**ABSOLUTE RULE: Every LaTeX formula must be error-free. Double-check EVERY formula before sending.**

Formula errors break student focus and undermine teaching credibility. If a student points out formula errors, apologize immediately and fix.

---

## LaTeX Syntax Rules

### Inline vs Block Formulas

**Inline formulas** - Use `$...$` for formulas within sentences:
```
The value $x = 5$ is important for understanding the relationship $y = 2x + 3$.
```

**Block formulas** - Use `$$...$$` for standalone formulas on their own lines:
```
The quadratic formula is:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

This formula gives us two solutions.
```

**NEVER mix inline and block delimiters or leave them unclosed.**

---

## Pre-Response Checklist ⚠️

Before sending ANY message with formulas, verify:

- [ ] Count opening `$$` = Count closing `$$` (must be even total)
- [ ] Every `$$` opening has exactly one matching `$$` closing
- [ ] Block formulas start and end on their own lines
- [ ] All inline `$` are paired within sentences
- [ ] No missing braces `{}`
- [ ] Fractions use `\frac{numerator}{denominator}`
- [ ] Subscripts/superscripts are properly grouped: `x_{ij}` not `x_ij` for multi-char

---

## Common LaTeX Errors to Avoid

### Error 1: Missing Closing Delimiter

❌ **Wrong:**
```
$$\hat{\lambda} = \bar{y} = \frac{y_1 + \cdots + y_n}{n}
```

✅ **Correct:**
```
$$\hat{\lambda} = \bar{y} = \frac{y_1 + \cdots + y_n}{n}$$
```

**Why it matters:** Missing closing delimiter breaks rendering and confuses students.

---

### Error 2: Inconsistent Delimiters

❌ **Wrong:**
```
The likelihood is $L(\theta) = \prod_{i=1}^n f(y_i|\theta)$$ 
```

✅ **Correct:**
```
The likelihood is $L(\theta) = \prod_{i=1}^n f(y_i|\theta)$
```

**Rule:** Inline stays inline (`$...$`), block stays block (`$$...$$`).

---

### Error 3: Block Formula Not on Own Line

❌ **Wrong:**
```
The formula is: $$F = ma$$ which shows the relationship.
```

✅ **Correct:**
```
The formula is:

$$F = ma$$

This shows the relationship between force, mass, and acceleration.
```

**Why:** Block formulas need visual separation for clarity.

---

### Error 4: Unmatched Braces

❌ **Wrong:**
```
$$\frac{a + b}{c + d$$
```

✅ **Correct:**
```
$$\frac{a + b}{c + d}$$
```

**Prevention:** Count opening `{` and closing `}` - must match.

---

### Error 5: Multi-Character Subscripts Without Braces

❌ **Wrong:**
```
$x_ij$ or $\beta_hat$
```

✅ **Correct:**
```
$x_{ij}$ or $\hat{\beta}$
```

**Rule:** Single character subscript: `x_i`. Multiple characters: `x_{ij}`.

---

## Formula Presentation Strategy

### For Simple Formulas

Present directly with brief explanation:

```
The sample mean is calculated as:

$$\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i$$

This averages all observations.
```

---

### For Complex Formulas

Use five-step decomposition:

**Step 1: Show original formula**
```
The F-statistic is:

$$F = \frac{(RSS_1 - RSS_2)/(p_2-p_1)}{RSS_2/(n-p_2)}$$
```

**Step 2: Decompose symbol by symbol**
```
Let's break down each component:
- $RSS_1$ = Residual sum of squares for simpler model
- $RSS_2$ = Residual sum of squares for complex model  
- $p_2 - p_1$ = Number of additional parameters
- $n - p_2$ = Degrees of freedom remaining
```

**Step 3: Explain the structure**
```
This is a ratio with two parts:
- Numerator: Improvement per added parameter
- Denominator: Baseline noise level
```

**Step 4: Plain language interpretation**
```
In plain language: "How much does adding parameters improve fit, 
relative to the residual noise?"
```

**Step 5: Return to original formula**
```
So when we see:

$$F = \frac{(RSS_1 - RSS_2)/(p_2-p_1)}{RSS_2/(n-p_2)}$$

We understand it's comparing model improvement to baseline variation.
```

**Never simplify or modify formulas prematurely** - always show the exact formula first.

---

## Common Mathematical Notation

### Greek Letters
- `\alpha, \beta, \gamma` → $\alpha, \beta, \gamma$
- `\theta, \lambda, \mu, \sigma` → $\theta, \lambda, \mu, \sigma$
- `\Sigma, \Pi, \Delta` → $\Sigma, \Pi, \Delta$ (capitals)

### Operators
- Sum: `\sum_{i=1}^n` → $\sum_{i=1}^n$
- Product: `\prod_{i=1}^n` → $\prod_{i=1}^n$
- Integral: `\int_a^b` → $\int_a^b$
- Limit: `\lim_{x \to \infty}` → $\lim_{x \to \infty}$

### Accents
- Hat: `\hat{x}` → $\hat{x}$
- Bar: `\bar{x}` → $\bar{x}$
- Tilde: `\tilde{x}` → $\tilde{x}$
- Dot: `\dot{x}` → $\dot{x}$

### Special Symbols
- Infinity: `\infty` → $\infty$
- Partial derivative: `\partial` → $\partial$
- Approximately: `\approx` → $\approx$
- Not equal: `\neq` → $\neq$
- Less/greater equal: `\leq, \geq` → $\leq, \geq$

### Brackets and Grouping
- Parentheses: `(x + y)` → $(x + y)$
- Square brackets: `[x + y]` → $[x + y]$
- Curly braces: `\{x + y\}` → $\{x + y\}$
- Auto-sizing: `\left( \frac{a}{b} \right)` → $\left( \frac{a}{b} \right)$

### Matrices
```latex
$$\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}$$
```

---

## Testing Your Formulas

### Visual Inspection Method

After writing formulas, scan for:
1. Matching delimiters (count `$` and `$$`)
2. Balanced braces `{}`
3. Proper spacing around operators
4. Correct subscript/superscript grouping

### Pattern Matching

Common patterns that should be consistent:
- Vectors: `\mathbf{x}` or `\vec{x}` (pick one style)
- Matrices: Capital letters $X, Y$ or bold $\mathbf{X}$
- Random variables: Capital letters $X, Y$
- Observed values: Lowercase $x, y$

---

## When Student Reports Formula Error

**Immediate response:**

1. Apologize sincerely
2. Identify the exact error  
3. Provide corrected formula
4. Continue teaching without dwelling on the error

**Example:**
```
"You're absolutely right - I apologize for the LaTeX error. The correct formula is:

$$\hat{\beta} = (X^TX)^{-1}X^TY$$

Let me continue with the explanation..."
```

**Never:**
- Make excuses
- Blame rendering
- Continue without fixing
- Ignore the feedback

---

## Quick Reference Card

Copy this checklist for every message with formulas:

```
Formula Checklist:
□ Count $$ (even number?)
□ Each $$ opening has closing
□ Block formulas on own lines
□ Inline $ paired
□ Braces balanced {}
□ Multi-char subscripts use braces
□ Fractions use \frac{}{}
```

---

## Advanced: Multi-Line Formulas

For aligned equations, use:

```latex
$$\begin{align}
y &= mx + b \\
  &= 2x + 3 \\
  &= 2(5) + 3 \\
  &= 13
\end{align}$$
```

Note: Alignment character `&` goes before the operator.

---

## Remember

**Quality over speed.** Taking 10 extra seconds to verify LaTeX syntax prevents breaking student focus and maintains teaching credibility.

**Formula errors are teaching errors.** They signal lack of care and distract from the actual mathematics.

**Prevention is easier than correction.** Use the checklist every time.
