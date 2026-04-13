import React from 'react';
import BaseCard, { CardProps } from './atoms/Card';

const Card: React.FC<CardProps> = (props) => <BaseCard {...props} />;

export default Card;
