import {NextResponse,NextRequest} from "next/server";
import { prisma } from "@/lib/prisma";
import {auth} from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
    try {
        const {userId} = await auth();

        if(!userId){
            return NextResponse.json({error:"Unauthorized"}, {status:401});
        }

        const videos = await prisma.video.findMany({
            where: {
                userId: userId
            },
            orderBy:{
                createdAt:"desc"
            }
        });
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({error:"Failed to fetch videos"}, {status:500});
    }
}
    