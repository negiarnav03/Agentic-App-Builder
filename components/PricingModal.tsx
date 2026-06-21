"use client";

import React from 'react'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { BlueTitle } from './resuables';
import { PricingTable } from '@clerk/nextjs';

interface PricingModalProps {
    children: React.ReactNode;
    reason?: "credits" | "upgrade";
}

const PricingModal = ({ children, reason = "upgrade" }: PricingModalProps) => {

    const title =
        reason === "credits" ? "You're out of credits" : "Upgrade your plan";

    const description =
        reason === "credits"
            ? "Buy more credits to continue building"
            : "Upgrade to access premium features and higher limits.";



    return (
        <Dialog>
            <DialogTrigger className={"cursor-pointer"}>{children}</DialogTrigger>
            <DialogContent
                className={"border-white/8 bg-[#0f0f0f] p-0 text-white sm:max-w-6xl max-h-[90dvh] overflow-y-auto"

                }>
                <DialogHeader className='px-6 pt-6 pb-2'>
                    <DialogTitle className="font-serif text-xl tracking-tight.text-white/90 ">Are you absolutely sure?</DialogTitle>
                    <BlueTitle className='text-4xl'>{title}</BlueTitle>
                    <DialogDescription className='text-sm text-white/35'>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className='px-6 pb-6'>
                    <PricingTable
                        checkoutProps={{
                            appearance: {
                                elements: {
                                    drawerRoot: {
                                        zIndex: 2000,
                                    }
                                }
                            }
                        }} />
                </div>

            </DialogContent>
        </Dialog>
    )
}

export default PricingModal;