const { expectRevert, ether } = require('@openzeppelin/test-helpers');
const { deployAllProxies } = require('../../deployments');
const {
  getNetworkConfig,
  deployLogicContracts,
} = require('../../deployments/common');
const { deployVRC } = require('../../deployments/vrc');
const { removeNetworkFile, registerValidator } = require('../common/utils');

const Wallet = artifacts.require('Wallet');
const Validators = artifacts.require('Validators');
const Operators = artifacts.require('Operators');
const Managers = artifacts.require('Managers');

contract('Wallet', ([_, ...accounts]) => {
  let networkConfig, wallet;
  let [admin, operator, sender, recipient, manager, anyone] = accounts;
  let users = [admin, operator, sender, recipient, manager, anyone];

  before(async () => {
    networkConfig = await getNetworkConfig();
    await deployLogicContracts({ networkConfig });
    let vrc = await deployVRC({ from: admin });
    let proxies = await deployAllProxies({
      initialAdmin: admin,
      networkConfig,
      vrc: vrc.options.address,
    });
    let operators = await Operators.at(proxies.operators);
    await operators.addOperator(operator, { from: admin });

    let managers = await Managers.at(proxies.managers);
    await managers.addManager(manager, { from: admin });

    let validatorId = await registerValidator({
      poolsProxy: proxies.pools,
      operator,
      sender,
      recipient,
    });

    let validators = await Validators.at(proxies.validators);
    const { logs } = await validators.assignWallet(validatorId, {
      from: manager,
    });
    wallet = await Wallet.at(logs[0].args.wallet);
  });

  after(() => {
    removeNetworkFile(networkConfig.network);
  });

  it('users cannot withdraw from wallet directly', async () => {
    for (let i = 0; i < users.length; i++) {
      await expectRevert(
        wallet.withdraw(users[i], ether('1'), {
          from: users[i],
        }),
        'Permission denied.'
      );
    }
  });
});
