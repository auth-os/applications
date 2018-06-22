# auth_os applications:

This repository contains a set of applications built using the auth_os framework. auth_os utilizes a unique application architecture to facilitate the building of contracts that are truly modular, as well as interoperable.

### Install:

Currently, each application has its own `package.json` - run `npm install` in the root directory of each project, which will install the auth_os core contracts and dependencies. 

### Test:

`npm test`

### Using applications:

Interacting with applications is standard to auth_os - a designated script executor contract forwards calldata to the app's storage contract which determines the address at which logic is stored, and delegatecalls the application's logic library. For safety and efficiency, **every call made to auth_os apps will at some point during execution, revert**. This does not mean the entire transaction will revert - instead, the revert is expected and handled by the contracts involved in the transaction. On sites like etherscan, this gives the appearance of several failed calls: [working as expected](https://ropsten.etherscan.io/address/0x5eadd1456ce64247b48bac2e53605b4a934c53fd)!

For more information, see: https://github.com/auth-os/core/blob/master/README.md
