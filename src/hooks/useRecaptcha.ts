"use client";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

export const useRecaptcha = () => {
    const { executeRecaptcha } = useGoogleReCaptcha();

    const getRecaptchaToken = async (action: string): Promise<string | null> => {
        if (!executeRecaptcha) {
            console.error("Execute recaptcha not yet available");
            return null;
        }
        return await executeRecaptcha(action);
    };

    return { getRecaptchaToken };
};
