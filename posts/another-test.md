# Testing again

## Why? Because regex issues

So I've been working on adding lots of informative data (and also tags,
etc) to the titles of posts, and have therefore found it necessary to
actually *have* the title itself instead of just compiling and inserting
the markdown. Initially, I've sorta duped this by going with filenames,
which matched the markdown title closely, but this is too manual. And
I want changes in the md title to actually get reflected in the end
product so it's not just useless text

Regex to the rescue. First line title is parse for it's content and
given **extra care** upon it's insertion into the document. I've been
using `/<h1.*>(.*)<\/h1>/g` to compile the regex. Unfortunately, it's
not working for the last, Test article.

I'm making another article to check if it's potentially only
understanding the first article. That would be a problem.

## Some debug later

So apparently the last `/g` doesn't need to have a g after it. Who knew.

On the bright side, I'd like to share with y'all a wonderful regex
resource: the [Regex Playground](https://regexr.com/57p34)! Really
helped me gain confidence in building regex patterns. Also, unfortunately,
it's inclusion of the `/g` led me to the bug metioned above. It's fine.
