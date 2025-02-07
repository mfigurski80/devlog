# Periodic Loans on the Network

I've been building a Periodic Loan contract to eventually deploy on the Ethereum mainnet, with the idea of potentially turning it into a startup. This is something that's going to be tradeable as an NFT, so buying one will function like buying an income stream.

One of the issues I've encountered, likely just as many other blockchain developers, is gas costs. It takes ~$30 to mint a new loan, and around $5 to transfer it around -- this fee is particularly noticable given that this is technically replicating a financial instrument. The project has undergone it's first gas optimization already, and I want to describe that as well as plan out future optimization.

There are a few categories that these optimizations will focus on:

## The Structs

This is mostly implemented. Namely, I wanted to reduce minting costs by reducing how much data I'm storing on the chain with each mint, and therefore need to optimize how I'm representing each loan struct. Previously, the loan would look like:

``` solidity
struct PeriodicLoan {
    bool active; // whether contract is still active or completed
    address beneficiary; // address service payments should be made to
    address borrower; // 'minter' of contract
    uint256 period; // how often payments required
    uint256 nextServiceTime; // next payment required
    uint256 balance; // remaining payment amount
    uint256 minimumPayment; // minimum payment amount
}
```

This was an inefficient implementation, because even though every variable was technically useful to the code at some point, there was a better way to store this data into:

- less variables
- that were smaller
- and packed together

This of course necessitated some changes to the code logic, but it turns out that the new implementation was actually simpler as well! This is the struct I ended up with:

``` solidity
struct PeriodicLoan {
    bool failed; // whether service payments were missed
    address minter; // address that minted this contract
    uint16 nPeriods; // how many periods until maturity
    uint16 curPeriod; // current period (how much paid)
    uint32 periodDuration; // how much time a single period lasts
    uint64 startTime; // block time this contract was minted
    uint128 couponSize; // how large a coupon is every period
    // note: uints add to 256. Efficiency, and realistic limitations
}
```

As you can see, some changes were made. Variables like `beneficiary` were entirely removed, in favor of storing those more efficiently in other places and passing them as parameters. The actual data used to represent the loan, including the term, periods, payments, etc. was optimized to use smaller values while not losing information, allowing me to *reduce* the size of these variables and pack them together, resulting in a smaller storage size cut from ~80 bytes to nearly ~30. It was a good change that I'm proud of. Another of the big optimizations here is that in the old representation, we had to update two different fields while servicing the loan (`nextServiceTime` and `balance`), while this new representation needs only `curPeriod` to be updated (and it's a smaller variable so that might make a difference too).

I was actually surprised to see minting costs only reduce to 70%, given how much less storage space was being used and how much simpler logic was. Servicing costs actually went up a tiny bit. This is still something I'm investigating.

## Future Optimization

The tiny decrease in gas costs convinced me that I need to start thinking more radically about this to make the contract usable at all. I'm still in the process of researching options, and will write future entries here as I discover new things or think about new ways to re-organize

## Layer 2 ZK Rollups

I'm in the middle of investigating potential ZK (Zero Knowledge) services that batch transactions and simply commit the Merkel Root of the resulting state to the chain. Most prominent of these is [LoopRing](https://loopring.org/#/). I'm concerned that this will reduce the visiblity of the data stored on the chain, so I'm not ready to jump into this yet.

## ERC1155

My contract structure is currently build around a token contract that is capable of storing and managing loan data, and a reference to a sidecar contract that manages collateral. I've recently discovered the ERC1155 contract standard, which is kinda exactly what I was going for with the collateral manager. Implementing this interface might help me make cheaper collateral transactions.
