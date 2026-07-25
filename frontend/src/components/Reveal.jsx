import React from 'react';
import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
};

// Fades/slides a single element in once it scrolls into view.
export const Reveal = ({ children, delay = 0, className }) => (
    <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
        transition={{ duration: 0.55, ease: EASE, delay }}
    >
        {children}
    </motion.div>
);

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09 } },
};

// Wrap a grid/list; each direct <StaggerItem> child fades/slides in one
// after another as the group scrolls into view.
export const StaggerGroup = ({ children, className }) => (
    <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
    >
        {children}
    </motion.div>
);

export const StaggerItem = ({ children, className, ...rest }) => (
    <motion.div className={className} variants={fadeUp} transition={{ duration: 0.45, ease: EASE }} {...rest}>
        {children}
    </motion.div>
);
