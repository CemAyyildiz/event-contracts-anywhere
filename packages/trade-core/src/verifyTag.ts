import {
  createPublicClient,
  decodeEventLog,
  http,
  parseAbi,
  type Hex,
} from "viem";
import {
  encodeHostTag,
  formatHostTag,
  parseHostTag,
} from "./attribution.js";

const RPC = "https://dream-rpc.somnia.network";

const orderPlacedAbi = parseAbi([
  "event OrderPlaced(uint128 indexed orderId, (uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs) placedOrder)",
]);

export type VerifiedTag = {
  txHash: Hex;
  tags: string[];
  owners: string[];
  matchesHost: boolean | null;
};

export async function verifyTaggedTx(
  txHash: string,
  hostId?: string,
): Promise<VerifiedTag> {
  const hash = txHash.trim() as Hex;
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("need a 32-byte tx hash");
  }
  const client = createPublicClient({
    transport: http(RPC),
  });
  const receipt = await client.getTransactionReceipt({ hash });
  const tags: bigint[] = [];
  const owners: string[] = [];
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: orderPlacedAbi,
        data: log.data,
        topics: log.topics,
      });
      const placed = decoded.args.placedOrder;
      tags.push(parseHostTag(placed.userData));
      if (placed.owner) owners.push(placed.owner);
    } catch {
      /* other event */
    }
  }
  const expected = hostId ? encodeHostTag(hostId) : null;
  return {
    txHash: hash,
    tags: tags.map(formatHostTag),
    owners,
    matchesHost: expected == null ? null : tags.some((t) => t === expected),
  };
}
