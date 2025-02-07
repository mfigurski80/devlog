# Strawberry and Tartiflette

This post is unfortunately not about food

I've recently had the privilege of working on graphql apis in Python. There are 4
main packages I'm aware of for creating graphql apis in python:

* [Graphene](https://github.com/graphql-python/graphene)
* [Strawberry](https://github.com/strawberry-graphql/strawberry)
* Axio-something (can'tremember)
* [Tartiflette](https://github.com/tartiflette/tartiflette)

My project had already taken the road less traveled by: due to early-misconceptions
of the features we needed to implement, the project ended up avoiding a lot of the
standard libraries like SQLAlchemy. I was looking for a library that fit the project

## Graphene

Graphene is the most stable and dominant library for all graphql-related things in
python... I only skimmed the documentation but it seemed too rigid for my purposes.
Had I used SqlAlchemy or anything default, this would've been nice to set up. Alas.

## Strawberry

Originally just a fruit, strawberry is now a new graphene engine with Python at its
core.It, like Graphene, utilizes a code-first approach, as opposed to a schema-first.
This means that the schema (shape of the data to be exposed) is not defined in some
SDL .graphql file, but rather in the python code itself, which means that there is
potential to link it *directly* with actual sql table definitions. This would be
really nice. The way you are supposed to define the schema is beautiful here.

It is, however, incredibly new. Documentation is very much a work in progress: one of
the main examples didn't actually work because of missing
[forward reference](https://github.com/strawberry-graphql/strawberry/issues/340)
feature. On that note,this is where I submitted my first open-source
[pull request](https://github.com/strawberry-graphql/strawberry/pull/368) to fix the
documentation issue!

## Tartiflette

Tartiflettes are, I think, the french version of *paellas*. A graphql library straight
from the french studio of DailyMotion, Tartiflette boasts stability, opinionated format,
and a very complete setup tutorial.

Going through this, I slowly realized that Strawberry was actually super workable and I
simply had zero context to work without documentation. Either way, Tartiflette is the
library I chose for my current project because it was fastest to get up and running.

If I had to do this all over again, I would likely stick a bit longer to strawberry. It
seems to be an incredible package, one which I might consider contributing to someday.