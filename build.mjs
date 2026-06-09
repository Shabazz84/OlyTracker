// Transpiles docs/src/app.jsx -> docs/app.js (JSX -> React.createElement, minified).
// React / ReactDOM are loaded as UMD globals in index.html, so we transform only — no bundling.
import * as esbuild from "esbuild";

const opts = {
  entryPoints: ["docs/src/app.jsx"],
  outfile: "docs/app.js",
  bundle: false,        // no imports in the source; everything is a page global
  minify: true,
  sourcemap: true,
  jsx: "transform",     // classic runtime -> React.createElement (global React)
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  target: ["chrome90", "safari14", "firefox90"],
  charset: "utf8",
  legalComments: "none",
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log("watching docs/src/app.jsx ...");
} else {
  await esbuild.build(opts);
  console.log("built docs/app.js");
}
