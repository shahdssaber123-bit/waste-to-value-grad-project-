import React from "react";

export default function SectionHeader({
    eyebrow,
    title,
    highlight,
    description,
    centered = false,
    titleClassName = "text-black",
    descriptionClassName = "text-black",
    eyebrowClassName = "",
}) {
    return (
        <div
            className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}
        >
            {eyebrow && <p className={`gold-label mb-3 ${eyebrowClassName}`}>{eyebrow}</p>}

            <h2 className={`font-heading text-3xl font-bold leading-tight sm:text-4xl ${titleClassName}`}>
                {title}{" "}
                {highlight ? (
                    <span className="text-gradient-gold">{highlight}</span>
                ) : null}
            </h2>

            {description ? (
                <p className={`mt-4 text-base leading-relaxed ${descriptionClassName}`}>
                    {description}
                </p>
            ) : null}
        </div>
    );
}
