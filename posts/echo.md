# The Echo Chamber

This is a write-up of the short but really cool project, found on [github](https://github.com/mfigurski80/EchoChamber) and deployed at [echo.mikolaj.space](https://echo.mikolaj.space). 

## Aren't echo chambers bad

This project is a support microservice for a friend's multiplayer online chess game [here](https://rohanjhunjhunwala.com). It allows multiple frontend js clients to connect to themselves and exchange data. The name is very clever because what the service actually does is pool together websocket connections that want to be together and echo all the messages between them. You effectively are able to websocket connect to another client

## Use cases?

Easy multiplayer setup. Even easier to build a non-persistent chat application. Potentially could be used for video, audio calls, and could maybe be converted into a crypto exchange without too much structural change.

## Security implications?

Don't send personal data over these. Recognize that when you connect a js client, you don't necessarily know who's listening or what they will do with what you send them. For the love of christ, don't trust what you get back. All that said, normal sockets are pretty okay, so I think frontend-to-frontend websockets shoud be fine too. Visiting a website with this type of websocket connection being used won't endanger you more than visiting a website using a normal server connection.

As for security vulnerabilities on my end -- this is getting DDOS protected automatically. Can't think of any other issues. No there's no way remote code execution would work here btw.

## Building

Was fun building this in golang. Ended up storing the streams in a slice, instead of messing around with multithreaded stuff and streams (would've been more janky anyway). It's really clean right now, I might publish a walkthrough on how to build something like this.

For the future, I want to create a system that divides different applications and gives them a separate room namespace (in a way that maintains the currently stateless nature of the app). Potentially using jwt somehow. Would be cool, allow me to deploy more stuff than just my friend's application.

Also please don't use this until I do that btw. You'll interfere with the current functionality, and I'll interfere with yours back.
