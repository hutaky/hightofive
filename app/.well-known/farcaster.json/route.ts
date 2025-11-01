import { NextResponse } from "next/server";
import { APP_URL } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    accountAssociation: {
      header: "eyJmaWQiOjUxMTg0MywidHlwZSI6ImF1dGgiLCJrZXkiOiIweEVhQTJhNjkwRmIzZTExMDU0NDAxN0VmYTAyYmFjNmFGYWE3RTUyNTMifQ",
      payload: "eyJkb21haW4iOiJoaWdodG9maXZlLnZlcmNlbC5hcHAifQ",
      signature: "QT4Ku+gp3L1/1y2JLPuAKRDBgVNTydRDDixD+uhqEnwV2MhUiKXQP+hMEAlVC7R21dRQanxFkDAJ/uqfXG1yCBs="
    },
    frame: {
      version: "1",
      name: "DigBase App",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: `${APP_URL}/images/feed.png`,
      screenshotUrls: [],
      tags: ["monad", "farcaster", "miniapp", "template"],
      primaryCategory: "developer-tools",
      buttonTitle: "Launch Template",
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#ffffff",
      webhookUrl: `${APP_URL}/api/webhook`
    },
  });
}
