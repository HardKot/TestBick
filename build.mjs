import * as esbuild from 'esbuild'
import fs from 'fs'
import { execSync } from "child_process"
const { version } = JSON.parse(fs.readFileSync("./package.json"))


const createBundle = (pathToBuild) => {
  esbuild.buildSync({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    platform: 'node',
    tsconfig: "./tsconfig.json",
    outdir: pathToBuild,
  })
}

(() => {
  const pathToBuild = `./build/prod/v${version}`
  createBundle(pathToBuild)
})()

