# Websocket Forwarding Server Part 2

This is part 2 in a tutorial series where we're creating a microservice to forward and group together websockets. You can find part 1 [here](/echo-tut).

In the first part, we build out a basic http server in Go and saw the functions that let us implement a websocket connection. Here, I want to walk through creating a global connection **pool**, or global room, among which we can forward websocket messages.

## A Global Pool

To begin with, lets make a quick **pool** type to make us have to type less when declaring future parameters. Next the `upgrader` variable declaration in the same file we worked on in the last part, add the following type:

``` golang
type pool map[string]*websocket.Conn
```

Something to realize here is that the `*` in the declaration means that we're actually going to be storing a `websocket.Conn` pointer, not the actual variable. This is more of a side fact though -- the variable we get from our `upgrader` function is also a pointer, and we interact with all the methods through the pointer. We don't have to be aware that this is such for our purposes.

There are also some potentially scandalous design decisions I'm making here. Notably:

- Pool is going to hold a series of websocket connections (or pointers). This implies that every time a connection joins the pool, we're going to have to add it to this series and make it public, which in turn has other implications that I will review a bit later. Keep this point in mind.
- Less of an issue is the fact that we're using a map. This'll let us keep each websocket attached to its own id and make removing these easier. Consider what would happen if this was a slice instead -- every time an item is removed, all the id's (or identifying indexes) would change. This would make removing later connections once they close harder, because we just lost where the closed connection is.

Let's go ahead and make the main global room now as well. In the future, we will also turn this into a rooms map such that clients can choose which pool they connect to. For now, a single global variable will do:

``` golang
var globalPool = make(pool, 0)
``` 

This creates a single instance of the pool struct, with an initial size of 0.

## Terminology and Concepts

I want to explain another thing about what it means to have a global variable here, and what the httpHandler functions are in relation. The global pool is constant, which means that it *does not* change every time someone connects or hits a httpEndpoint. This is in contrast to the httpHandler functions -- those run in a new *thread* every time they get called. In practice, this means that multiple of these can run in parallel, on different cores of the CPU, and that the variables inside these are not going to be globally accessible. However, any changes they make to the global pool will be visible from outside the thread -- this is part of the reason we are using a map, as maps are much more threadsafe than lists. There is less of a chance of two threads getting confused as they work on the same variable.

I'm going to use the term *workers* when refering to these individual calls running on different threads now.

Next, we're going to need to enable each websocket connection to interact with this global pool, in four crucial steps: entering, exiting, reading messages, and writing messages.

## Some utils

Before we do that, let's go ahead and create a utility function that will do a crucial task for us: generating unique ids for the connections. This is something that could technically be done by hashing some aspects of the connection, or by getting the date of connection, but I think that generating whats called a **uuid** is the best option because there's little change of collision, or of two independently created uuids being the same.

Make a new file called **utils.go**. Inside, let's define the following function:

``` golang
package main

import (
	"crypto/rand",
	"fmt"
)

func makeUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	uuid := fmt.Sprintf("%X-%X-%X-%X-%X",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
	return uuid, nil
}
```

This is not my code: it's actually a version of this [stackoverflow response](https://stackoverflow.com/a/25736155/9043642).

> Note that this is actually a `pseudo_uuid` because it is missing the non-random identifiers like MAC address and whatever else RFC4122 specified? So it's actually more random
> 
> ~ Xeoncross

Anyway, we don't need to use any standard per say, just need a random id with minimal collision and this function does that.

## Entering and Exiting the room

Let's go ahead, prepare for the future, and make a new `poolReader` function that will take a websocket connection and handle it's interactions with the globalPool:

``` golang
func poolReader(conn *websocket.Conn) {
	// tasks:
	// subscribe to pool

	// remove from pool

	// write to pool

	// read from pool
}
```

In the previously defined function `wsHandler`, remove the existing for-loop that we created and replace it with a call to this function with the `ws` variable. Once this is set up and connected, we can start filling the function in.

Firstly, we need to take the connection and subscribe it to the pool. This is not super difficult to do once we have a uuid function to create a random id for us. Functionally, all we have to do is create an id and attach the connection to the `globalPool` connection map.

``` golang
// subscribe to pool
uuid := makeUUID()
globalPool[uuid] = conn	
```

Next, we'll have to remove this connection once it closes. It's useful to realize that, inside this function, we're going to be adding a for-loop or something similar that will only error or break once the connection closes. Therefore, we can assume that as soon as we exit the function, the connection must have been closed.

Golang gives us a really cool keyword that does exactly what we want here: `defer`. It takes the action you give it and runs it as soon as the function exits. Let's use it to remove the uuid from the global pool:

``` golang
// remove from pool
defer delete(globalPool, uuid)
```

## Writing and Reading from the Socket 

Next up is the actually somewhat difficult part: we need to find a way to grab messages from a websocket and write it to other websockets. Remember how I mentioned beforehand that the potentially scandalous design we chose will have other implications? This is where they come to light.

An instinctive way of implementing this is indeed with a form of a channel, where once a message is recieved, the individual worker puts it on the global channel, where all the other workers see it and update their own clients with the new message. This is not going to work here. We didn't instantiate a global channel, we have a global pool instead. The solution for us is to have the worker, when recieving a message, update all the other connections. Like this:

``` golang
// write to pool
// read from pool
for {
	messageType, p, err := conn.ReadMessage()
	if err != nil {
		log.Println(err)
		break // connection closed
	}
	for k, c := range globalPool {
		if k == uuid {
			continue
		}
		if err := c.WriteMessage(messageType, p); err != nil {
			log.Println(err)
		}
	}
}
```

What's happening here?

Lots of this should be familiar from the last part. We have a for loop to iterate over all the messages as they come in, we read the message and the message type. When an error is returned, that means the connection was closed (or that it's otherwise failed) and we can break the for loop to remove the connection for good.

However, once we have the message, we do something a bit different with it -- we iterate over the entire global pool, over each existing connection, and we write the message out to them. Note that we take care to skip the sender's connection.

So why is this potentially scandalous? It's not instinctively the solution we'd go for -- it's more instinctive to make each connection private to its worker, and have a global message list which each worker can update and send to their connection as they want. Unfortunately, this leads to a score of other problems.

Furthermore, our design is actually optimized for observation. Say we had the case where there was 10 observers and 1 speaker -- we'd need 11 threads for all 11 workers to run as soon as a message gets sent. In this design however, one worker can handle updating all 11 of the observers, and we do not sacrifice efficiency if all 11 clients want to message (since we still use 11 threads).

One issue that could come up is that, if two messages were to come at nearly the same time, the workers could update the connections in different order, resulting in the message A being first for some clients and message B being first for others.

## Testing

This new `poolReader` function should be connected to the `wsHandler` function, such that we can reach it from the '/ws' path. Go ahead and launch the server, and then open the previous *index.html* file we created in the browser. Then, go ahead and open a new tab of the same site. Remember to get the console open for both of these.

If everything worked, we should now have two clients running, connected to the Golang server we've made. In one of the consoles, type `socket.send('hello')`. Nothing should appear. But if you change tabs, you should see that the *other* client got the message properly.

## End

This is the end of part 2 of a longer tutorial on the creation of a websocket forwarding server. [Part 1 is available here](/echo-tut). In the next part, we'll separate the global room into individual rooms that people can connect to, making the whole server much more useful. Hope you've enjoyed the tutorial thus far.
