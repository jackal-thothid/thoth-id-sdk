# Welcome to the thoth.id Sdk Documentation 👋

> 🚧 **Disclaimer: Project Status** 🚧
>
> The thoth.id project is currently under development.
> * The nano contract has **not yet been launched** to any public Hathor network.
> * The official API endpoint `domains.thoth.id` is **not yet active**.
>
> This SDK is provided for testing and integration purposes. You can use it with a local development environment or a testnet contract.

## About the Documentation

This documentation will guide you through the process of integrating the thoth.id Sdk into your applications. Whether you're building a new decentralized application (dApp) or integrating with an existing one, this SDK provides all the tools you need to interact with the thoth.id naming system on the Hathor Network. 🚀

You can find the source code for this Sdk on [GitHub](https://github.com/jackal-thothid/thoth-id-sdk).

## What is thoth.id? 🆔

thoth.id is a decentralized naming service built on the Hathor Network. It allows you to map human-readable names (e.g., `username.htr`) to wallet addresses, effectively creating a digital identity on the blockchain. This simplifies the process of sending and receiving cryptocurrencies and interacting with dApps, as you no longer need to use long and complex wallet addresses.

With thoth.id, you can:

*   **Create a unique digital identity:** Register a human-readable name that represents you on the Hathor Network. 👤
*   **Simplify transactions:** Send and receive funds using your thoth.id instead of a long wallet address. 💸
*   **Build a reputation:** Your Thoth ID can be used across multiple dApps, allowing you to build a consistent reputation within the ecosystem. 🏆

## What is the Hathor Network? 🌐

The Hathor Network is a scalable and easy-to-use blockchain platform designed for real-world use cases. It features a unique hybrid architecture that combines a Directed Acyclic Graph (DAG) of transactions with a blockchain of blocks. This design allows Hathor to be highly scalable and to process a large number of transactions per second with no fees.

Key features of the Hathor Network include:

*   **Scalability:** A novel architecture that can handle a high volume of transactions. 📈
*   **Ease of Use:** Simplified token creation and nano contract deployment. 👍
*   **Security:** A secure and reliable network for decentralized applications. 🔒

## The Purpose of this SDK 🛠️

The thoth.id SDK is a TypeScript library that simplifies interaction with the thoth.id nano contracts. It provides a set of easy-to-use methods that allow you to:

*   Resolve thoth.id names to wallet addresses.
*   Check if a thoth.id is available.
*   And more!

By using this SDK, you can easily integrate thoth.id functionalities into your applications without having to worry about the low-level details of interacting with the nano contracts.