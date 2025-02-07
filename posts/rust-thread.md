# Multi-Threading with Rust 

One of my assignments this past semester was an interesting project that had us implementing the Apriori Algorithm for pattern recognition. The professor allowed a range of programming languages to choose from, including Java, Python, R; I managed to get special permission to do this in Rust, and the experience led me down a rabbit hole of optimization that reinforced my understanding of the language.

## What is Pattern Recognition?

This is an algorithm that runs on a series of keyword lists, grouped by how they appear in the 'wild'. In practice, this could be shopping lists -- items, grouped together in baskets by how they were bought together. The algorithm intends to take all these individual items and figure out how often they appear together in a dataset. While we can of course mine the frequency of *all* possible combinations of items, the Apriori algorithm does a lot of optimization by cutting the combinations (also called patterns, or k-patterns if they have a specific size k) that fall below a minimum threshold. This is a fairly common and simple algorithm -- I won't go over it's full implementation in this article

## Rust Traits and SortedIntersect

One of the optimizations I introduced into the algorithm is the idea that each possible combination also stores a list of all the 'rows' that directly support it from the original dataset. In practice, this was really a list of row numbers. When creating a new k+1 pattern from a given k pattern, I would no longer have to scan the entire dataset to find its support, but rther just take the intersect of these two number vectors. The way I initially tried to do this was by using a package `array_tool`, found at https://github.com/danielpclark/array_tool. I was assuming that it was written in a way superior to anything I could do with a minimal amount of time -- this is an assumption that would be true for languages such as Python, where important libraries (especially ones related to vectors) are generally written with C-Bindings.

However, because I knew that the vectors I was intersecting was sorted (and suspected that there might be a sortedIntersect method somewhere in the library), I ended up looking at the code myself. I found that the way the intersect was implemented was actually O(n^2), which was severely slowing down my code.

To solve this, I re-implemented a new, SortedIntersect trait, following the style established in the package:

``` rust
pub trait IntersectSorted<T> {
    /// Intersect two sorted sequences
    fn intersect(&mut self, other: &Self);
}

impl<T: PartialEq + PartialOrd + Copy> IntersectSorted<T> for Vec<T> {
   fn intersect(&mut self, other: &Self) {
        let (mut i, mut j, mut cursor) = (0, 0, 0);
        while cursor + i < self.len() && j < other.len() {
            if self[cursor + i] == other[j] {
                self[cursor] = self[cursor + i];
                cursor += 1;
                j += 1;
                continue;
            }
            if self[cursor + i] > other[j] {
                j += 1;
            } else {
                i += 1;
            }
        }
        self.resize(cursor, self[0]);
    }
}
```

This code is admittedly making more assumptions than it's predecessor -- besides the assumption of sorted-ness, I also require the import of two more traits to the generic type this method is supposed to work for: PartialOrd, and Copy. Although this could be hypothetically re-implemented with Clone instead, the current version can only be used with Vectors containing basic types that are comparable (so mostly just numeric ones).

A notable point at which rust came into play is the ability to strictly control memory usage here -- where-as in Python I'd probably have to let the compiler decide what to do, here I can explicitly transfer the values I want to the beginning of the array, and then cut it to size.

## Multi Threading, Hash Maps, and Rayon

This project had lots of potential for multi-threading -- hypothetically, each individual k-pattern level generation can happen in parallel. The possibilities were huge cost savings, and was specifically the reason I picked Rust over Python.

Multi-threading is very simple to do in Rust, if you require no mutations. The Rayon package allows you to simply convert a common iterator (`foo.iter()`) into a parallel one (`foo.par_iter()`) with no more effort than that. However, since I needed mutation, I had to struggle with the safety checker. In the end, I ended up slapping a giant mutex and an Atomic Reference Counter (ARC) onto my central hashmap data structure. This ended up pausing access to the data structure every time a write had to be performed -- which was very often. Still, I think I got a little bit of a speed-up after implementing this.

This is not the appropriate way to do it, I think. There are some Hash Map structures that have specifically been designed to support as much thread-safe insertion as possible. The Rust HashBrown structure is, afaik, one of these. These structures can hold invidual locks on each of the 'buckets' of elements present at a specific index in the hash table, thereby separating out the write locks such that many can happen simultaneously, most of the time. I was hoping to be able to leverage this, but time cut me short.

## Rust as a Quick Iteration Language

Programming in Rust is essentially a process of: writing some code, and then wrestling with the compiler errors for somewhere between 5 seconds (in most cases, the error messages are extremely helpful, sometimes even explicitly pointing to a solution), or a couple days. This is absolutely exacerbated by the fact that I'm a beginner -- that said, a lot of people will be, given the intense learning curve.

It's a language I definitely look forward to working with in the future, but I'll probably be sticking to GoLang for the time being, since performance and memory control aren't as critical for me as the quick iteration times I achieved with Go.
