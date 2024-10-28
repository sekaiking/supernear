import { SparkConsumer } from "@/types";
import consumers from "./consumers";

export function getSpark(sparkName: string): {
  consumer?: SparkConsumer;
} {
  if (sparkName in consumers) {
    return {
      consumer: consumers[sparkName as keyof typeof consumers],
    };
  }
  return {};
}

// export function getSpark(sparkName: string): {
//   consumer?: SparkConsumer;
//   definition?: SparkDefinition;
// } {
//   if (sparkName in definitions) {
//     const name = sparkName as keyof typeof definitions;
//     const definition = definitions[name];
//
//     if (definition.type == "system" && sparkName in consumers) {
//       const consumer = consumers[name];
//       return {
//         definition,
//         consumer,
//       };
//     }
//     return {
//       definition,
//     };
//   }
//   return {};
// }
