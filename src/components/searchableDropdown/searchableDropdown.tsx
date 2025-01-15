import React, { useState } from "react";
import styles from "../../app/artwork/page.module.css";
import stylesLocal from "./searchableDropdown.module.css";
interface SearchableDropdownProps {
    options: { id?: number; name: string }[] | string[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    isEditMode?: boolean;
    isEditing?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder,
    disabled = false,
    isEditMode = false,
    isEditing = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const normalizedOptions =
        typeof options[0] === "string"
            ? (options as string[]).map((str) => ({ name: str }))
            : (options as { id?: number; name: string }[]);

    const filteredOptions = normalizedOptions.filter((option) =>
        option.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange("");
        setSearchQuery("");
        setIsOpen(false);
    };

    const isClearButtonEnabled =
        value && (!isEditMode || (isEditMode && isEditing));

    return (
        <div className={stylesLocal.dropdownContainer}>
            <input
                type="text"
                className={`${styles.input} ${styles.select} ${stylesLocal.dropdownInput}`}
                placeholder={placeholder}
                value={isOpen ? searchQuery : value}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                disabled={disabled}
            />
            {isOpen && (
                <ul className={stylesLocal.dropdownList}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <li
                                key={index}
                                className={stylesLocal.dropdownListItem}
                                onMouseDown={() => handleSelect(option.name)}
                                onMouseOver={(e) =>
                                    (e.currentTarget.className = `${stylesLocal.dropdownListItem} ${stylesLocal.dropdownListItemHover}`)
                                }
                                onMouseOut={(e) =>
                                    (e.currentTarget.className = stylesLocal.dropdownListItem)
                                }
                            >
                                {option.name}
                            </li>
                        ))
                    ) : (
                        <li className={stylesLocal.dropdownListEmpty}>
                            No options found
                        </li>
                    )}
                </ul>
            )}
            {isClearButtonEnabled && (
                <button
                    type="button"
                    className={stylesLocal.clearButton}
                    onClick={handleClear}
                    disabled={disabled}
                >
                    Clear
                </button>
            )}
        </div>
    );
};

export default SearchableDropdown;
