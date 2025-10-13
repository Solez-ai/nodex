import React from "react";
import styled from "styled-components";

export const StyledLogo = styled.div<{ $fontSize: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: ${({ $fontSize }) => $fontSize};
  color: ${({ theme }) => theme.TEXT_NORMAL};

  img {
    height: 24px;
    width: 24px;
    object-fit: contain;
  }
`;

const StyledFooterText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.SILVER};
  margin-top: 4px;

  a {
    color: ${({ theme }) => theme.INTERACTIVE_NORMAL};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

interface NodexLogoProps {
  fontSize?: string;
  hideLogo?: boolean;
  hideText?: boolean;
  showFooter?: boolean;
}

export const NodexLogo: React.FC<NodexLogoProps> = ({
  fontSize = "1.2rem",
  hideLogo = false,
  hideText = false,
  showFooter = false,
}) => {
  return (
    <div>
      <StyledLogo $fontSize={fontSize}>
        {!hideLogo && <img src="/assets/nodex_logo.png" alt="Nodex" />}
        {!hideText && <span>Nodex</span>}
      </StyledLogo>
      {showFooter && (
        <StyledFooterText>
          Created by{" "}
          <a href="https://github.com/Solez-ai" target="_blank" rel="noopener noreferrer">
            Samin Yeasar
          </a>
          <div>
            <a href="https://github.com/Solez-ai" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            {" · "}
            <a href="https://x.com/Solez_None" target="_blank" rel="noopener noreferrer">
              X/Twitter
            </a>
          </div>
        </StyledFooterText>
      )}
    </div>
  );
};
