# [hfs-monitor-agent](../../releases/)

## Description

[`hfs-monitor-agent`](../../releases/) is a plugin developed for **HTTP File Server version 3 (HFS 3)**, providing essential tools and data for integration with the [**HFS Monitor**](../../../HFS-Monitor) application.

---

## Key Features

### 1. Traffic Monitoring
* **Speed tracking**: Monitors incoming (**in**) and outgoing (**out**) traffic speeds in megabytes per second (MB/s).
* **Automatic calculation**: Traffic data is recalculated automatically every **5 seconds**.

### 2. Active Connections Overview
Detailed information for each active connection:
* **IP address**
* **Username**: Displays "Anonymous" for anonymous connections.
* **Session start time**
* **Transferred data**: Uploaded and downloaded data.
* **User-Agent**
* **Connection ID**
* **Requested file/url**
* **Current speed**: Data transfer rate in bytes per second (B/s).

### 3. IP Address Blocking
* **Flexible blocking**: Blocks unwanted IP addresses via **HFS API** by sending a **POST request** with a specified blocking reason.

---

## Security

To ensure security, access to the plugin's **API is restricted to `localhost` only** (both **IPv4** and **IPv6**).

### Protected endpoints:
* `/current-connections`
* `/current-traffic`
* `/block-connection`

---
Support:
* BTC: `bc1qeuq7s8w0x7ma59mwd4gtj7e9rjl2g9xqvxdsl6`
* TON: `UQAOQXGtTi_aM1u54aQjb8QiXZkQdaL9MDSky5LHN0F5-yF2`
