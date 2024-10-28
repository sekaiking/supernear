import React, { ReactNode } from "react";
import type { MessageProps, SparkMessageContent } from "@/types";

import { getSpark } from "./utils";
import Icon from "@/components/common/icon";
import { MessageId } from "@chatui/core/lib/components/Message";
import { log } from "@/utils/log";

export function Spark({
  message,
  update,
}: {
  message: MessageProps<SparkMessageContent>;
  update: (id: MessageId, msg: MessageProps<SparkMessageContent>) => void;
}): ReactNode {
  if (message.content) {
    const spark = getSpark(message.content?.result.name);
    if (!spark.consumer) {
      log("Spark without consumer", message.content.result);
    }
    return (
      <div className={"ChatSpark"}>
        <div className={"ChatSparkHeader"}>
          <Icon name="sparkles" color="#ffb300" fontSize={20} />
          <h3>
            {message.content!.result.name.charAt(0).toUpperCase() +
              message.content!.result.name.replaceAll("_", " ").slice(1)}
          </h3>
        </div>
        <div className="ChatSparkMain">
          {spark.consumer
            ? spark.consumer.render?.(
                message,
                (msg: MessageProps<SparkMessageContent>) =>
                  update(message._id, msg),
              )
            : "Not Implemented Yet!"}
        </div>
      </div>
    );
  }

  return <div>Invalid Spark</div>;
}
