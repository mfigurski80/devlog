# Websocket Forwarding Server, Part 1

In this series, I'm going to walk through the creation of a microservice for forwarding and grouping websockets together, in *Golang*.

Occasionally, in the front-end Javascript world, we want a way of connecting our client to another to have them exchange information. For most use cases, it's easiest to create a database where both clients send and pull information from -- this allows whatever messages we are passing to be stored, so that both clients can see them even if they aren't active at the moment. Sometimes however, we want this connection to be instantaneous, where the client pings the server and the server pings another client back down right away.

This is the solution we're going to be building. If you want to create a frontend for this -- it becomes much more easy to create a live chat application or even voice/video calling using a server like this.

## Requirements

You need to have golang installed. Additionally, we're going to be using the gorilla websocket package, which can be installed with `go get github.com/gorilla/websocket`. 

You need to be somewhat familiar with Golang and Javascript, although I'll do my best to explain everything as I go along. Additionally, it's incredibly useful to have a basic understanding of how networking functions and how applications and servers can connect to each other using ports.

## Setting Up a Server in Go

You have likely already seen what normal http servers look like in Go. We can use the standard library `net/http` package to build a simple, hello world server, like the following example:

``` golang
import "net/http"

func httpEndpoint(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("hello world"))
}

func main() {
	http.HandleFunc("/", httpEndpoint)
	http.ListenAndServe(":8080", nil) 
}
``` 

Let me take a moment to explain this code.

The first function, `httpEndpoint`, is designed to handle an incoming http request. As you see, it's given a response writer variable and the actual request data. The response writer is the object we use to respond to the request and send something back to the person who's making it. In this case, we simply send them "hello world". Note that everything we send has to be a byte array -- we cannot send strings or structs. In practice, this means we have to convert our response like so when trying to respond.

The `main` function is what gets called when Go executes the program. It's taking the `httpEndpoint` function we have and attaching it so that all requests coming to the / path are handled by it. The second line sets up the server to listen to incoming requests.

If you run this, you can access your website at <http://localhost:8080>. You should see just an empty page with "hello world" printed on it.

## Setting up WebSockets

Let's convert this into a websocket server instead! There are a couple things we need to add to transform this into a websocket server. The first: a websocket upgrader

``` golang
import (
	"net/http"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
}
```

Note that websocket is itself something we have to import from gorilla (a github user). This should import automatically if you use the websocket variable and save, or if you run `golint` on the file afterwards.

So, what is an upgrader? This is an object that will allow us to take a normal http connection, to which we respond to once and then close, and transform it into a WebSocket connection. It is in a way similar to our `httpHandler` function, in that it can take a request and a response writer, but instead of writing a single time, it tells the client that the connection has been transformed, and lets us read/write to it as many times as we want. Until it gets closed of course.

The parameters we plug in to make the upgrader are simply how big each message can be, for both writing and reading. Set them to 1024 for now. It's unlikely you'll need more than that -- it's usually more useful to send more messages than making these bigger.

The second thing we need is an endpoint. Below where you create the upgrader, go ahead and define a `wsHandler`.

``` golang
func wsHandler(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *httpRequest) bool { return true }

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		panic(err)
	}

	// do websocket stuff here...
}
```

The second line we run in the function does the majority of the work for us. We're calling the upgrader and getting out of it an upgraded WebSocket and an error (which we then handle)

So. Now that we have a websocket, what can we do with it? As a demonstration, let's making it respond to every request sent across the socket with the same text. To do that, we have to work inside our new `wsHandler` function, after we create the websocket.

``` golang
for {
	mType, m, err := ws.ReadMessage()
	if err != nil {
		panic(err)
	}
	err = ws.WriteMessage(mType, m)
	if err != nil {
		panic(err)
	}
}
```

This is the golang equivalent of `while(true)`, which you can find in so many other languages. What we are doing here is we are grabbing each message that comes up, getting it's type and data, handling errors, and writing it back out again to the same connection. And then repeating that infinitely. Because `ws.ReadMessage()` is what's called a *blocking* operation, the while loop won't be spinning endlessly waiting for messages but will wait on that line until a message exists for it to read.

And so we've done it! Go ahead and connect this new handler function just like the previous one, inside the `main` function, and bind it to the path "/ws". Now, if you run the server, you'll be able to make a websocket connection to <http://localhost:8080/ws>.

## Connecting to a WebSocket

One last piece of the puzzle for now: how exactly do we know this is working? We can't exactly open this /ws path in a browser, because our browser only handles http requests and not WebSocket requests. For that, we're going to need to write a mini testing frontend with some javascript. Nothing fancy:

``` html
<body>
	<p>Open your web console to view javascript results
	with [Ctrl] + [Shift] + [I]</p>
</body>
<script>
	// code will go here
</script>
```

This is just a basic website with some instructions if we forget. Let's go ahead and add the Javascript to open a websocket connection

``` javascript
let socket = new WebSocket('ws://localhost:8080/ws')

socket.onopen = () => console.log('connected')

socket.onclose = () => console.log('closed')

socket.onmessage = console.log
```

This will create a new websocket connection to the url we're hosting our service on, and defining some utility functions for various events that can happen in the websocket world. Save this file as `index.html`, open it in a browser, a go ahead and open the web console. The connection should have succeeded. Try sending a message by writing `socket.send('hello')` into the console. You should get that same response back from your server.

## End

This is just part 1 of a longer tutorial on the creation of this websocket forwarding project. Keep a lookout for part 2, where we'll look more at handling our socket connections in Go and figure out how to pool them and send messages between them properly. I hope you've enjoyed the tutorial so far.
