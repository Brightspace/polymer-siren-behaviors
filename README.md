# d2l-polymer-siren-behaviors

Shared [Polymer](https://www.polymer-project.org/1.0/)-based behaviors and modules for implementing and consuming web components.

## Installation

`d2l-polymer-siren-behaviors` can be installed from npm:
```shell
npm install d2l-polymer-siren-behaviors
```

## Usage

Import the component or scripts as needed.

```html
<head>
	<link rel="import" href="../d2l-polymer-siren-behaviors/store/entity-behavior.html">
	<link rel="import" href="../d2l-polymer-siren-behaviors/store/siren-action-behavior.html">
</head>
```

## Versioning and Releasing

This repo is configured to use `semantic-release`. Commits prefixed with `fix:` and `feat:` will trigger patch and minor releases when merged to `main`.

To learn how to create major releases and release from maintenance branches, refer to the [semantic-release GitHub Action](https://github.com/BrightspaceUI/actions/tree/main/semantic-release) documentation.
