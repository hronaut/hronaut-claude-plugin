#!/usr/bin/env node
import { relay } from '../src/bridge.js'

await relay()
process.exit(0)
