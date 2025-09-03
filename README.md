# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## AWS profile for local development
To configure your local development environment to assume the IAM role used by the container:

1. Set up a profile in your `~/.aws/credentials` file. For example:
    ```
    [593223115766_PowerUserAccess]
    aws_access_key_id=xxxxxxx
    aws_secret_access_key=xxxxxxx
    aws_session_token=xxxxxxxx
    ```
    This is obtainable during the login process into Easydairy's AWS account, from the section "Command line or programmatic access". This credential configuration expires after 12 hours.

2. Set up another profile with the below entry:
    ```
    [local_web_dev_role]
    role_arn = arn:aws:iam::593223115766:role/easydairy-web-IAMRole-dev-EKSClusterdevServiceAccou-4xdrBuzGVmeX
    source_profile = 593223115766_PowerUserAccess
    ```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
   parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
   },
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
