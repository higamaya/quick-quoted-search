const SRC = "src";
const DST = "dist";

const path = require("path");
const resolvePath = (...args) => path.resolve(__dirname, ...args);
const srcPath = resolvePath(SRC);
const dstPath = resolvePath(DST);

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { exec } = require("child_process");
const { merge } = require("webpack-merge");

const commonConfig = {
  context: srcPath,
  entry: {
    background: ["./background.js"],
    content: ["./content.js", "./content.scss"],
    action: ["./action.js", "./action.scss", "./action.html"],
    options: ["./options.js", "./options.scss", "./options.php"],
  },
  output: {
    path: dstPath,
    filename: "[name]_bundle.js",
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name]_bundle.css",
    }),
    new CopyPlugin({
      patterns: [
        { from: "*.json" },
        { from: "_locales", to: "_locales" },
        { from: "icons", to: "icons" },
        { from: "fonts", to: "fonts" },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
      {
        test: /__config\.js$/,
        use: [
          {
            loader: "val-loader",
          },
        ],
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: "css-loader",
            options: {
              url: false,
            },
          },
          {
            loader: "sass-loader",
            options: {
              implementation: require("sass"),
            },
          },
        ],
      },
      {
        test: /\.(html|php)$/,
        type: "asset/resource",
        generator: {
          filename: "[name].html",
        },
      },
      {
        test: /\.(html|php)$/,
        use: [
          {
            loader: "extract-loader",
          },
          {
            loader: "html-loader",
            options: {
              sources: false,
              preprocessor: (content, loaderContext) => {
                if (loaderContext.resourcePath.endsWith(".php")) {
                  return new Promise((resolve, reject) => {
                    const childProcess = exec("php", {}, (error, stdout, stderr) => {
                      if (error || stderr) {
                        reject(new Error(stdout + stderr, { cause: error }));
                      } else {
                        resolve(stdout);
                      }
                    });
                    childProcess.stdin.end(content);
                  });
                } else {
                  return Promise.resolve(content);
                }
              },
            },
          },
        ],
      },
    ],
  },
};

const developmentConfig = {
  mode: "development",
  devtool: "inline-source-map",
};

const productionConfig = {
  mode: "production",
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  performance: {
    hints: false,
  },
};

module.exports = (env, argv) => {
  if (argv.mode === "production") {
    return merge(commonConfig, productionConfig);
  } else {
    return merge(commonConfig, developmentConfig);
  }
};
