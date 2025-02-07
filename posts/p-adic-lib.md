# P-Adic Arithmetic Library 🧮
One of the projects I’m currently working on is a Rust library built to perform basic arithmetic in the p-adic number system. I will not explain how p-adics work here, as there are much better resources ([this video](https://www.youtube.com/watch?v=3gyHKCDq1YA) among them). What this post tries to explain is my methodology behind representing and operating on infinite numbers _efficiently_. Note that most of the examples here will be assuming p=10, and the library might initially do this as well.

## How to represent a 10-Adic number in memory?

Obviously, natural numbers are included and can be represented as normal u64s, etc. Negative numbers aren’t — arguable can ditch support for signed stuff like i64. Definitely don’t support operations with floats — maybe only ‘convert from’ if I’m really bored

Library should have several representations based on what kind of non-natural p-adic number is being represented:

- PureRecurring — a number who's digits immediately repeat, like …66666. Can be represented as a simple unsigned value that the program will know to repeat (6)! This should be treated as a sub-case of the following:
- MixedRecurring or Rational — ie a number who’s digits eventually or immediately repeat, like …6666667. This can be represented by two static unsigned values representing the pure repeating part (66) and the non-repeating part (7). It’d be cool to initialize it’s arguments in that order, because of how p-adic numbers go off to the left: `Rational::new(66, 7)` instead of the other way around, which would buck the standard of putting important args first. Idk, cool, edgy maybe. Also cool if these two args could be any unsigned number type — direct control over element’s size. This would also be the most common type I suspect
- BigPureRecurring and BigRecurring — ie a number which mathematically is exactly like the ones above, but either (or both) repeating or static parts are too big for a u64 to represent. Will utilize the num_biguint library (or something similar) to represent these, but will share logic with above
- Irrational — ie a number who’s digits will never fall into a permanent repetition, like a reverse _pi_: …62951413. The user might have to provide a generator function for these digits. It is my goal to **avoid supporting** this type as long as possible, as I suspect no real optimizations can be made here.

The representation itself should always allow for the user to query _higher specificity —_ ie something like printing `Rational::new(66, 7).show(100)` to show the first hundred digits.

Users should also be able to put an artificial max-limit on any of these numbers that would follow them into any operations performed on it

## Operations

For 10-adics, we expect to implement +, -, \*.

We want a user to be able to perform …6667 + …3332 and then get 100 digits, all while storing these numbers efficiently with potentially different underlying representations. How do we do this?

Firstly, it’s obvious that the representations must be hierarchical: Natural ⇒Rational ⇒ BigRecurring ⇒ Irrational. Any operation performed with different levels of representations must result in the higher level — we know that adding a Natural (1) to an Irrational (…21235) MUST return an Irrational result (…21236)

However, we might potentially have to store all the steps of more complex operations to get arbitrary digits, especially with Irrationals. Say we add two Irrationals (…21235 + …49251 ⇒ …70486) and then we want to get 100 digits from it. We don’t know yet that 100 digits are required (although maybe some compile-time magic could be performed), and so the resulting irrational will need to somehow remember both of it’s sources and perform more steps of addition when more digits are required. Alternatively, the user could specify a digit limit and the value could be converted to a Rational / BigRational representation.

Is this still necessary for Rational representations? Say for example we perform `Rational::new(66, 7) + Rational::new(11, 1)` — it would be trivial to say it results in a normal `Rational::new(77, 8)`, which is much more memory efficient than storing, say, the two source values plus operation metadata. This operation might become harder if the two values don’t have the same length of digits, or the operation causes an overflow of some sort. Taking these cases separately:

1.  **Different digit lengths**: `Rational::new(66, 7) + Rational::new(141, 22)`. This translates to the mathematical representation of: …66666667 + …14114122. The answer is clearly: …80780789, with an optimal representation of `Rational::new(807, 89)`.
    
    How would the computer get this? Starting with the rightmost, static part — make both terms the same size by pulling digits from the repeating value. In this case, we have a repeating value `66` and a static value `7`, so pulling a digit across will leave us with a static value `67` and repeating `66` (note that, though not visible in this example, we actually took the last digit of the repetition value and moved it to the front). We add this to `22` to produce a result: `89`. Note that there’s no overflow involved atm.
    
    The repeating value also needs to be added. In this case, we are performing `66 + 141`. The count of digit involved are 2 and 3 — we need to find a value to expand these two repeating values such that they are they same size, which in this case can just be 2\*3 ⇒ _6_. Therefore, our new operation is now `666666 + 141141`, which is much easier to perform and leaves us with `807807` — the repeating part of our resulting rational.
    
    Note that the representation is already space inefficient — while we can perform some sort of de-patternizing of the Rational number to reduce this to the optimal structure, we should primarily expect the programmer to also define the initial rational’s repeating part as only ‘6’. This de-patternizing step can be offered separately for the programmer to use as they see fit!
    
2.  **Overflow during operation**: `Rational::new(888, 1) + Rational::new(111, 9)`. In the p-adic system, this translates to: …8881 + …1119, resulting in …0000 (or just 0). This can also be split into two parts: static and repeating.
	
    Static part, we need to perform `1 + 9`, which is clearly `10` and so overflows. Where do we put the extra 1 in the 10’s place? Ofc, into the repeating part.
    
    Take the repeating part: `888 + 111` with an additional element of overflow from the previous _static_ operation. The initial part is clearly `999`, so that is what we will be attaching a static overflow to. What we will usually try to determine here is how much of the repeating part to move into the static part — the overflow we got will frequently fail to overflow the repeating part as well, in which case we will just move some amount of digits from the repeating to the static and shift the repeat around. The example I chose is not so kind however. Performing `999 + 1` results in a value with more than three digits, so overflow. This will be a special case — if we detect output overflow that’s equal to the input overflow, we simply have to truncate everything afterwards and take just the desired number of digits from the right ⇒ `000`. This let’s us have the desired result.
    
    Overflow will behave differently with operations like multiplication however — it will not necessarily always be overflowing a single unit. This is addressed in the next section

Note that subtraction will not be covered — while not trivial, they should be deduce-able as the same concepts as above will apply. Additionally, underflows are still unit, so nothing really changes.

## Multiplication

Multiplication might be difficult — overflows will not necessarily be unit, and we need to perform multiple passes with an n^2 algorithm. It also makes a lot less intrinsic sense; for example, the 'simple' pure-recurring numbers …5 and …23, when multiplied together, result in a 20-digit mixed-recurrence representation: (…487093153759820426)5.

Like… what? It's incredibly simple for these values to fall into harmonic patterns of overflows that are difficult to analyze. 

To start, a quick refresher on how normal 'long' multiplication works. I'd recommend the [explanations with pictures](https://www.wikihow.com/Do-Long-Multiplication), since they're the most clear (a wikihow on basic math has been, non-ironically, helpful to me; I never said I was smart guys). Now, what happens if that top term is infinite? Think about it. Try to do long multiplication with a natural and a pure recurring number in the p-adic system. Doing this will convince you of the following:

1. The full repeating part can be multiplied against the full static part, and then offset by the size of the repeating part. This is a simple optimization, letting us multiply 2 or more digit recurrences with a similar amount of actual operations: given …23 and 55, we can work with 1265 right away and just transpose it by 2 to quickly get: (…7)65.
	
2. If the initial operation doesn't overflow, you know it simply repeats! 4 \* …12 = …48
	
3. If the amount of overflow ever repeats, you know you can stop multiplying because the two repetitions form a cycle! 9 \* …12 = (…09)08

### Multiplying Two Pure Recurring Numbers?

Multiplication of two pure-recurring numbers is more difficult, since the individual step is impossible to fully complete — whenever you move on to the next digit(s), you have *missed* infinitely many multiplications you were supposed to do. How to get away with this?
1. Recognize that multiplications are being repeated. Say you're multiplying two pure-recurring numbers *a* and *b*, with their representative numbers being *a'* and *b'* (assume they have an equal amount of digits, n). To get first n digits of result, you need first n of a' \* b'. This is the static part. To get second n digits, you need second n of a' \* b', as well as first n of a' \* b', *and then that same multiplication again*. Why? Try it. Perform long mult of 222 \* 666, pretend n is 1. The algorithm calls for 2 \* 6 to be present twice in the second column, and thrice in the third column. How can we use this to optimize?
	
2. Set a base number of a' \* b'. To generate next n digits while having k\*n, you can just multiply the base by k and shift it to it's proper position. There's a very simple algorithm for this that can be expressed (hopefully) in latex:
	$$ \sum_{i=0}^k(i+1) \times a' \times b' \times 10^{n \times i} \pmod{10^{k \times n}} $$

So what k should I pick to be able to find the recurrence? Firstly, we know such a recurrence must exist — rational-only multiplication yields a rational result — and so there must exist a finite k. Then, consider k=10. At the point where i reaches it's last value of k-1, the whole term will get shifted by an additonal position, meaning there will be an additional 0 of space to take any overflow from the addition of terms!! This means that k should be at most 10 to capture the full recurrence

---

## Magic 9's (maybe unrelated)

Did you know that 9 \* .1… is just 1? Just like 99 \* .45… is 45. I'm serious. Try it now. Open your python console or type it into google.

Conversely, 999 \* …152 is (…9)848, which is as close to simplified as it gets in the p-adic system — for this reason, I have henceforth adopted 9 as my favorite digit. However, I have not found a way to use this to simplify any operations described here. This is left as an excersize for the reader — please let me know if you find something!