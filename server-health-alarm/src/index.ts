import { SNSEvent } from "aws-lambda";

interface CloudWatchAlarmMessage {
  AlarmName: string;
  NewStateValue: string;
  NewStateReason: string;
  Region: string;
  StateChangeTime: string;
  Trigger: {
    MetricName: string;
    Namespace: string;
    Threshold: number;
    Period: number;
    Dimensions: { name: string; value: string }[];
  };
}

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;
const DISCORD_MENTION_ROLE_ID = process.env.DISCORD_MENTION_ROLE_ID!;

export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const message: CloudWatchAlarmMessage = JSON.parse(record.Sns.Message);

    const {
      AlarmName,
      NewStateValue,
      NewStateReason,
      Region,
      StateChangeTime,
      Trigger,
    } = message;

    const instanceId =
      Trigger.Dimensions?.find(({ name }) => name === "InstanceId")?.value ??
      "N/A";

    const emoji =
      NewStateValue === "ALARM" ? "🔴" : NewStateValue === "OK" ? "🟢" : "🟡";

    const content = [
      `## ${emoji} CloudWatch 경보: ${NewStateValue}`,
      `<@&${DISCORD_MENTION_ROLE_ID}>`,
      `**경보 이름**: ${AlarmName}`,
      `**시각**: ${StateChangeTime}`,
      `**리전**: ${Region}`,
      `**인스턴스**: \`${instanceId}\``,
      `**메트릭**: ${Trigger.Namespace} / ${Trigger.MetricName}`,
      `**임계값**: ${Trigger.Threshold}% (측정 주기: ${Trigger.Period}초)`,
      "",
      `**상세**: ${NewStateReason}`,
    ]
      .join("\n")
      .slice(0, 2000);

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }
};
