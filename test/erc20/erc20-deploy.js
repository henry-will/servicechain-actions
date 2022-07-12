const Caver = require('caver-js');
const axios = require('axios');
const fs = require('fs')

const conf = JSON.parse(fs.readFileSync(process.env.bridgeInfo || '../common/bridge_info.json', 'utf8'));

async function deploy(info, bridgeAbi, bridgeCode, tokenAbi, tokenCode) {
    const caver = new Caver(info.url);
    info.sender = caver.klay.accounts.wallet.add(info.key).address;

    try {
        // Deploy bridge
        const instanceBridge = new caver.klay.Contract(bridgeAbi);
        info.newInstanceBridge = await instanceBridge.deploy({data: bridgeCode, arguments: [true]})
            .send({from: info.sender, gas: 100000000, value: 0});
        info.bridge = info.newInstanceBridge._address;
        console.log(`info.bridge: ${info.bridge}`);

        // Deploy ERC20 token
        const instance = new caver.klay.Contract(tokenAbi);
        info.newInstance = await instance.deploy({data: tokenCode, arguments: [info.newInstanceBridge._address]})
            .send({from: info.sender, gas: 100000002, value: 0});
        info.token = info.newInstance._address;
        console.log(`info.token: ${info.token}`);
    } catch (e) {
        console.log("Error:", e);
    }
}

(async function TokenDeploy() {
    const testcase = process.argv[1].substring(process.argv[1].lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
    console.log(`------------------------- ${testcase} START -------------------------`)
    const childBuildPath = process.env.childBuildPath || '../build'
    const childBridgeAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/Bridge.abi`, 'utf8'));
    const childBridgeCode = fs.readFileSync(`${childBuildPath}/Bridge.bin`, 'utf8');
    const childTokenAbi = JSON.parse(fs.readFileSync(`${childBuildPath}/ServiceChainToken.abi`, 'utf8'));
    const childTokenCode = fs.readFileSync(`${childBuildPath}/ServiceChainToken.bin`, 'utf8');
    await deploy(conf.child, childBridgeAbi, childBridgeCode, childTokenAbi, childTokenCode);

    const parentBuildPath = process.env.parentBuildPath || '../build'
    const parentBridgeAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/Bridge.abi`, 'utf8'));
    const parentBridgeCode = fs.readFileSync(`${parentBuildPath}/Bridge.bin`, 'utf8');
    const parentTokenAbi = JSON.parse(fs.readFileSync(`${parentBuildPath}/ServiceChainToken.abi`, 'utf8'));
    const parentTokenCode = fs.readFileSync(`${parentBuildPath}/ServiceChainToken.bin`, 'utf8');
    await deploy(conf.parent, parentBridgeAbi, parentBridgeCode, parentTokenAbi, parentTokenCode);

    // add minter
    await conf.child.newInstance.methods.addMinter(conf.child.bridge).send({
        from: conf.child.sender,
        to: conf.child.bridge,
        gas: 100000000,
        value: 0
    });
    await conf.parent.newInstance.methods.addMinter(conf.parent.bridge).send({
        from: conf.parent.sender,
        to: conf.parent.bridge,
        gas: 100000000,
        value: 0
    });

    // register operator
    await conf.child.newInstanceBridge.methods.registerOperator(conf.child.operator).send({
        from: conf.child.sender,
        gas: 100000000,
        value: 0
    });
    await conf.parent.newInstanceBridge.methods.registerOperator(conf.parent.operator).send({
        from: conf.parent.sender,
        gas: 100000000,
        value: 0
    });

    // register token
    await conf.child.newInstanceBridge.methods.registerToken(conf.child.token, conf.parent.token).send({
        from: conf.child.sender,
        gas: 100000000,
        value: 0
    });
    await conf.parent.newInstanceBridge.methods.registerToken(conf.parent.token, conf.child.token).send({
        from: conf.parent.sender,
        gas: 100000000,
        value: 0
    });

    // transferOwnership
    await conf.child.newInstanceBridge.methods.transferOwnership(conf.child.operator).send({
        from: conf.child.sender,
        gas: 100000000,
        value: 0
    });
    await conf.parent.newInstanceBridge.methods.transferOwnership(conf.parent.operator).send({
        from: conf.parent.sender,
        gas: 100000000,
        value: 0
    });

    const filename = process.env.transferConfig
    fs.writeFile(filename, JSON.stringify(conf), (err) => {
        if (err) {
            console.log("Error:", err);
        }
    })

    // Initialize service chain configuration with three logs via interaction with attached console
    console.log(`subbridge.registerBridge("${conf.child.bridge}", "${conf.parent.bridge}")`)
    console.log(`subbridge.subscribeBridge("${conf.child.bridge}", "${conf.parent.bridge}")`)
    console.log(`subbridge.registerToken("${conf.child.bridge}", "${conf.parent.bridge}", "${conf.child.token}", "${conf.parent.token}")`)

    const url = conf.child.url
    let log = 'registering bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_registerBridge', [conf.child.bridge, conf.parent.bridge]);

    log = 'subscribing bridges to the child node'
    await jsonRpcReq(url, log, 'subbridge_subscribeBridge', [conf.child.bridge, conf.parent.bridge]);

    log = 'register token to subbridge..'
    await jsonRpcReq(url, log, 'subbridge_registerToken', [conf.child.bridge, conf.parent.bridge, conf.child.token, conf.parent.token]);

    console.log(`------------------------- ${testcase} END -------------------------`)
})();

async function jsonRpcReq(url, log, method, params) {
    if (typeof jsonRpcReq.id == 'undefined') jsonRpcReq.id = 0;

    console.log(log)
    await axios.post(url, {
        "jsonrpc": "2.0", "method": method, "params": params, "id": jsonRpcReq.id++
    }).then(res => {
    }).catch(err => {
        console.log(res.data.error)
    })
}