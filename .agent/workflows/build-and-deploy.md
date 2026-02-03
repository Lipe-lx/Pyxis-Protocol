---
description: Build and deploy Pyxis Protocol using the stable Docker environment
---

// turbo-all
1. Start the stable build container
```bash
docker run -d --name pyxis-builder -v $(pwd):/workdir -w /workdir backpackapp/build:v0.30.1 tail -f /dev/null
```

2. Stabilize dependency tree (resolve toolchain conflicts)
```bash
docker exec pyxis-builder cargo update -p cc --precise 1.0.98
docker exec pyxis-builder cargo update -p jobserver --precise 0.1.32
docker exec pyxis-builder cargo update -p proc-macro-crate@3.4.0 --precise 3.1.0
docker exec pyxis-builder cargo update -p borsh@1.6.0 --precise 1.5.1
docker exec pyxis-builder cargo update -p indexmap@2.13.0 --precise 2.5.0
docker exec pyxis-builder cargo update -p blake3 --precise 1.5.0
docker exec pyxis-builder cargo update -p constant_time_eq --precise 0.3.0
```

3. Build the program
```bash
docker exec pyxis-builder anchor build
```

4. Deploy/Upgrade the program
```bash
docker exec pyxis-builder solana program deploy \
    target/deploy/pyxis.so \
    --program-id EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q \
    --keypair target/deploy/authority.json \
    --url devnet
```

5. Cleanup
```bash
docker stop pyxis-builder && docker rm pyxis-builder
```
