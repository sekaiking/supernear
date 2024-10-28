import { callContractCosumer } from "./system/call-contract";
import { sendTokenConsumer } from "./system/transfer-tokens";
import { useExplorerConsumer } from "./system/use-explorer";

const consumers = {
  send_token: sendTokenConsumer,
  call_contract: callContractCosumer,
  use_explorer: useExplorerConsumer,
};

export default consumers;
