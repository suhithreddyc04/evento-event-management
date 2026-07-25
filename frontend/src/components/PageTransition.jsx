import { motion } from 'framer-motion';

const variants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

const PageTransition = ({ children }) => (
    <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
        {children}
    </motion.div>
);

export default PageTransition;
