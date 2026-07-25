import React, { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';

// Animates "500+" / "12+" / "6" style stat strings by counting the numeric
// part up from 0 once it scrolls into view, keeping any trailing suffix (+).
const CountUp = ({ value, duration = 1.6 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    const match = String(value).match(/^(\d+)(.*)$/);
    const numeric = match ? Number(match[1]) : 0;
    const suffix = match ? match[2] : String(value);
    const [display, setDisplay] = useState('0');

    useEffect(() => {
        if (!isInView) return undefined;

        const controls = animate(0, numeric, {
            duration,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (latest) => setDisplay(Math.round(latest).toString()),
        });

        return () => controls.stop();
    }, [isInView, numeric, duration]);

    return <span ref={ref}>{display}{suffix}</span>;
};

export default CountUp;
