// src/components/common/CalculatorModal.tsx

import React, { useState } from 'react';
import Modal from './Modal';

const CalculatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');

    const handleButtonClick = (value: string) => {
        if (value === 'C') {
            setInput('');
            setResult('');
        } else if (value === '=') {
            try {
                // Using eval() is okay for this simple, non-critical context.
                // For a production app with complex needs, a proper math parser would be better.
                const evalResult = eval(input.replace('x', '*').replace('÷', '/'));
                setResult(evalResult.toString());
            } catch (error) {
                setResult('Error');
            }
        } else {
            setInput(prev => prev + value);
        }
    };

    const buttons = [
        'C', '÷', 'x', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.'
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Calculator">
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="bg-gray-900 text-white text-right p-4 rounded-md mb-4">
                    <div className="text-gray-400 text-lg">{input || '0'}</div>
                    <div className="text-3xl font-bold">{result || ''}</div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {buttons.map(btn => (
                        <button
                            key={btn}
                            onClick={() => handleButtonClick(btn)}
                            className={`p-4 text-xl rounded-lg font-bold
                                ${['C', '÷', 'x', '-', '+', '='].includes(btn) ? 'bg-orange-500 text-white' : 'bg-gray-600 text-white'}
                                ${btn === 'C' ? 'col-span-2 bg-red-500' : ''}
                                ${btn === '=' ? 'col-span-2' : ''}
                                hover:opacity-80 transition-opacity`}
                        >
                            {btn}
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default CalculatorModal;