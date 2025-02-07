# Building a Blog Framework

## Start

Lots of webpack so far. What you are seeing is the result. The basic setup is
a pug compiled template with lots of md reading from a 'posts' file. Found a really
helpful stackoverflow post that provided me with this snippet:

``` javascript
each file in fs.readdirSync('./posts')
    != markdown(fs.readFileSync('./posts/'+file, 'utf8'))
```

What it basically is doing is going thru all the files in the post directory
and *directly inserting them* into the resulting html. Along with inserting the
css, this leaves us with a single file webpage. Pretty rad.

Anyway, need to go. Next up for this development is probably a) make the webpack
rebuild on update, and b) make post orderings title-agnostic (possibly thru some
sort of time-created ordering)

## Update

This is actually shaping up to be a useful tool. Finishing some of the styles, right
now, but I want to review what I've done for the general structure of the site.

I wanted, and still do, a simple one page blog to put my general experiences and
struggles with various cs problems on. Additionally, my preferred surge.sh hosting
(as of now) doesn't really support middleware -- just static files. I've managed to
go overboard with this. You're likely currently being served just a single html file,
containing all the posts, compiled from a folder of them and a pug template on my
pc.

Ideally, I can now just add a markdown post file and everything should update. I'd
need to recompile and re-upload the compiled doc to surge, but that's it. Maybe I'll
make an electron frontend for this at some point as well, just to make editing
suuuuper nice and encourage myself to write posts more.
