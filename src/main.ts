// @ts-ignore
;(global as any).WebSocket = require('ws')

import fs from 'fs'
import path from 'path'
import util from 'util'
import glob from 'glob'
import * as core from '@actions/core'
import {Buckets, Context} from '@textile/textile'
import {ThreadID} from '@textile/threads-id'

const readFile = util.promisify(fs.readFile)
const globDir = util.promisify(glob)

async function run(): Promise<void> {
  try {
    const api = core.getInput('api')
    const target = api.trim() != '' ? api.trim() : 'api.textile.io:3447'
    const ctx = new Context(`https://${target}`)

    const key: string = core.getInput('key').trim()
    const secret: string = core.getInput('secret').trim()
    if (!key || key === '' || !secret || secret === '') {
      core.setFailed('Invalid credentials')
      return
    }
    await ctx.withUserKey({
      key,
      secret,
      type: 0
    })

    const thread: string = core.getInput('thread')
    const threadID = ThreadID.fromString(thread)
    ctx.withThread(threadID)

    const remove: string = core.getInput('remove') || ''
    if (remove === 'true') {
      const buckets = new Buckets(ctx)
      const roots = await buckets.list()
      const name: string = core.getInput('bucket')
      const existing = roots.find(bucket => bucket.name === name)

      if (existing) {
        await buckets.remove(existing.key)
        core.setOutput('success', 'true')
      } else {
        core.setFailed('Bucket not found')
      }
      // success
      return
    }

    const buckets = new Buckets(ctx)
    const roots = await buckets.list()
    const name: string = core.getInput('bucket')
    const existing = roots.find(bucket => bucket.name === name)

    let bucketKey = ''
    if (existing) {
      bucketKey = existing.key
    } else {
      const created = await buckets.init(name)
      if (!created.root) {
        core.setFailed('Failed to create bucket')
        return
      }
      bucketKey = created.root.key
    }

    const pattern = core.getInput('pattern') || '**/*'
    const dir = core.getInput('path')
    const home = core.getInput('home') || './'
    const cwd = path.join(home, dir)

    const options = {
      cwd,
      nodir: true
    }
    const files = await globDir(pattern, options)
    if (files.length === 0) {
      core.setFailed(`No files found: ${dir}`)
      return
    }
    let raw
    for (let file of files) {
      const filePath = `${cwd}/${file}`
      const buffer = await readFile(filePath)
      const upload = {
        path: `/${file}`,
        content: buffer
      }
      raw = await buckets.pushPath(bucketKey, `/${file}`, upload)
    }

    const gateway = core.getInput('gateway')
    const url = gateway.trim() != '' ? gateway.trim() : 'hub.textile.io'

    const ipfs = raw ? raw.root.replace('/ipfs/', '') : ''
    core.setOutput('ipfs', ipfs)
    core.setOutput('ipfsLink', `https://ipfs.io${ipfs}`)

    core.setOutput('ipns', `${bucketKey}`)
    core.setOutput('ipnsLink', `https://${bucketKey}.ipns.${url}`)

    core.setOutput(
      'threadLink',
      `https://${thread}.thread.${url}/buckets/${bucketKey}`
    )

    const domain = core.getInput('domain')
    const dns = domain.trim() != '' ? domain.trim() : 'textile.space'
    core.setOutput('http', `https://${bucketKey}.${dns}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()