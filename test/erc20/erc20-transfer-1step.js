const Caver = require('caver-js');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync(process.env.transferConfig, 'utf8'));

const childBuildPath = process.env.childBuildPath || '../build'
const parentBuildPath = process.env.parentBuildPath || '../build'
const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/ServiceChainToken.abi`, 'utf8'));
const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/ServiceChainToken.abi`, 'utf8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parentTokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- parent sent to bob ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.child.url);
  const scnInstance = new scnCaver.klay.Contract(childTokenAbi, conf.child.token);

  const enCaver = new Caver(conf.parent.url);
  const enInstance = new enCaver.klay.Contract(parentTokenAbi, conf.parent.token);

  conf.child.sender = scnCaver.klay.accounts.wallet.add(conf.child.key).address;
  conf.parent.sender = enCaver.klay.accounts.wallet.add(conf.parent.key).address;
  const bob = "0xd40b6909eb7085590e1c26cb3becc25368e249e9";
  
  try {
    let balance = await scnInstance.methods.balanceOf(bob).call();
    console.log("bob balance:", balance);

    // Transfer main chain to service chain
    console.log("requestValueTransfer..")
    await enInstance.methods.requestValueTransfer(100, bob, 0, []).send({from:conf.parent.sender, gas: 1000000});
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000);

    // Check alice balance in Service Chain
    balance = await scnInstance.methods.balanceOf(bob).call();
    console.log("bob balance:", balance);
  } catch (e) {
    console.log("Error:", e);
  }
  console.log(`------------------------- ${testcase} END -------------------------`)
}

async function childTokenTransfer() {
  const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
  console.log(`------------------------- child send to alice ${testcase} START -------------------------`)
  const scnCaver = new Caver(conf.child.url);
  const scnInstance = new scnCaver.klay.Contract(childTokenAbi, conf.child.token);

  const enCaver = new Caver(conf.parent.url);
  const enInstance = new enCaver.klay.Contract(parentTokenAbi, conf.parent.token);

  conf.child.sender = scnCaver.klay.accounts.wallet.add(conf.child.key).address;
  conf.parent.sender = enCaver.klay.accounts.wallet.add(conf.parent.key).address;
  const alice = "0xc40b6909eb7085590e1c26cb3becc25368e249e9";

  try {
    let balance = await enInstance.methods.balanceOf(alice).call();
    console.log("alice balance:", balance);

    // Transfer main chain to service chain
    console.log("requestValueTransfer..")
    await scnInstance.methods.requestValueTransfer(100, alice, 0, []).send({from:conf.child.sender, gas: 1000000});
    // Wait event to be trasnferred to child chain and contained into new block
    await sleep(6000);

    // Check alice balance in Service Chain
    balance = await enInstance.methods.balanceOf(alice).call();
    console.log("alice balance:", balance);
  } catch (e) {
    console.log("Error:", e);
  }
  console.log(`------------------------- ${testcase} END -------------------------`)
}

(async function testErc20ValueTransfer() {
  await parentTokenTransfer()
  await childTokenTransfer()
})()