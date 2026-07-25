import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './dateTimePicker.css';

const EASE = [0.22, 1, 0.36, 1];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const useOutsideClose = (open, setOpen) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, setOpen]);
    return ref;
};

// Animated calendar dropdown — replaces a plain <input type="date">.
// value/onChange use the same 'YYYY-MM-DD' string format as the native input.
export const AnimatedDatePicker = ({ id, value, onChange, minToday = true }) => {
    const [open, setOpen] = useState(false);
    const [direction, setDirection] = useState(1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initial = value ? new Date(`${value}T00:00:00`) : today;
    const [viewYear, setViewYear] = useState(initial.getFullYear());
    const [viewMonth, setViewMonth] = useState(initial.getMonth());

    const ref = useOutsideClose(open, setOpen);

    const changeMonth = (delta) => {
        setDirection(delta);
        let m = viewMonth + delta;
        let y = viewYear;
        if (m < 0) { m = 11; y -= 1; }
        if (m > 11) { m = 0; y += 1; }
        setViewMonth(m);
        setViewYear(y);
    };

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    const displayLabel = value
        ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Select date';

    const handlePick = (day) => {
        const dateObj = new Date(viewYear, viewMonth, day);
        dateObj.setHours(0, 0, 0, 0);
        if (minToday && dateObj < today) return;
        onChange(toKey(viewYear, viewMonth, day));
        setOpen(false);
    };

    return (
        <div className="dtp-wrapper" ref={ref}>
            <button
                type="button"
                id={id}
                className={`dtp-trigger ${value ? '' : 'dtp-placeholder'}`}
                onClick={() => setOpen((o) => !o)}
            >
                <i className="bi bi-calendar-event"></i>
                <span>{displayLabel}</span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="dtp-popover"
                        initial={{ opacity: 0, y: -10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: EASE }}
                    >
                        <div className="dtp-cal-header">
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => changeMonth(-1)}
                                aria-label="Previous month"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </motion.button>
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.span
                                    key={`${viewYear}-${viewMonth}`}
                                    custom={direction}
                                    initial={{ opacity: 0, x: 18 * direction }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -18 * direction }}
                                    transition={{ duration: 0.2, ease: EASE }}
                                    className="dtp-cal-title"
                                >
                                    {MONTH_NAMES[viewMonth]} {viewYear}
                                </motion.span>
                            </AnimatePresence>
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => changeMonth(1)}
                                aria-label="Next month"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </motion.button>
                        </div>

                        <div className="dtp-weekdays">
                            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
                        </div>

                        <motion.div
                            key={`grid-${viewYear}-${viewMonth}`}
                            className="dtp-grid"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.012 } } }}
                        >
                            {cells.map((day, index) => {
                                if (!day) return <span key={`blank-${index}`} className="dtp-cell dtp-cell-blank" />;

                                const dateObj = new Date(viewYear, viewMonth, day);
                                dateObj.setHours(0, 0, 0, 0);
                                const disabled = minToday && dateObj < today;
                                const key = toKey(viewYear, viewMonth, day);
                                const isSelected = key === value;
                                const isToday = dateObj.getTime() === today.getTime();

                                return (
                                    <motion.button
                                        type="button"
                                        key={key}
                                        className={`dtp-cell ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                                        variants={{ hidden: { opacity: 0, scale: 0.7 }, visible: { opacity: 1, scale: 1 } }}
                                        whileHover={!disabled ? { scale: 1.15 } : {}}
                                        whileTap={!disabled ? { scale: 0.9 } : {}}
                                        disabled={disabled}
                                        onClick={() => handlePick(day)}
                                    >
                                        {isSelected && (
                                            <motion.span
                                                layoutId={`dtp-selected-day-${id}`}
                                                className="dtp-cell-highlight"
                                                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                            />
                                        )}
                                        <span className="dtp-cell-label">{day}</span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Animated time-slot dropdown — replaces a plain <input type="time">.
// value/onChange use the same 'HH:MM' 24h string format as the native input.
export const AnimatedTimePicker = ({ id, value, onChange, startHour = 0, endHour = 23, stepMinutes = 30 }) => {
    const [open, setOpen] = useState(false);
    const ref = useOutsideClose(open, setOpen);
    const listRef = useRef(null);

    const slots = [];
    for (let mins = startHour * 60; mins <= endHour * 60 + (60 - stepMinutes); mins += stepMinutes) {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        slots.push(`${pad(h)}:${pad(m)}`);
    }

    const formatLabel = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${pad(m)} ${period}`;
    };

    useEffect(() => {
        if (open && listRef.current) {
            const selectedEl = listRef.current.querySelector('.is-selected');
            if (selectedEl) selectedEl.scrollIntoView({ block: 'center' });
        }
    }, [open]);

    return (
        <div className="dtp-wrapper" ref={ref}>
            <button
                type="button"
                id={id}
                className={`dtp-trigger ${value ? '' : 'dtp-placeholder'}`}
                onClick={() => setOpen((o) => !o)}
            >
                <i className="bi bi-clock"></i>
                <span>{value ? formatLabel(value) : 'Select time'}</span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="dtp-popover dtp-time-popover"
                        initial={{ opacity: 0, y: -10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: EASE }}
                    >
                        <motion.div
                            ref={listRef}
                            className="dtp-time-list"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.015 } } }}
                        >
                            {slots.map((slot) => {
                                const isSelected = slot === value;
                                return (
                                    <motion.button
                                        type="button"
                                        key={slot}
                                        className={`dtp-time-slot ${isSelected ? 'is-selected' : ''}`}
                                        variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { onChange(slot); setOpen(false); }}
                                    >
                                        {isSelected && (
                                            <motion.span
                                                layoutId={`dtp-selected-time-${id}`}
                                                className="dtp-cell-highlight"
                                                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                            />
                                        )}
                                        <span className="dtp-cell-label">{formatLabel(slot)}</span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
