export default function ActionCard({
  title,
  description,
  items,
  buttonVariant,
  buttonIcon,
  buttonText,
  onButtonClick,
}) {
  const ButtonTag = "button";
  const buttonClass = buttonVariant === "primary" ? "primaryButton" : "secondaryButton";

  return (
    <div className="card actionCard">
      <div>
        <h3 className="actionTitle">{title}</h3>
        <p className="actionDesc">{description}</p>
        <ul className="actionList">
          {items.map((it) => (
            <li key={it.text} className="actionListItem">
              <span aria-hidden="true" style={{ opacity: 0.75 }}>
                {it.icon}
              </span>
              {it.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="actionButtonRow">
        <ButtonTag type="button" className={buttonClass} onClick={onButtonClick}>
          <span aria-hidden="true" style={{ opacity: 0.95 }}>
            {buttonIcon}
          </span>
          {buttonText}
        </ButtonTag>
      </div>
    </div>
  );
}

