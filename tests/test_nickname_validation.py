import pytest

from app.users import service


@pytest.mark.parametrize(
    "nickname",
    ["ab", "홍길동", "user_01", "Alice", "최강자123", "x" * 16],
)
def test_valid_nicknames(nickname: str) -> None:
    service.validate_nickname_format(nickname)


@pytest.mark.parametrize(
    "nickname",
    [
        "a",  # 1자
        "x" * 17,  # 17자
        "hello world",  # 공백
        "name!",  # 특수문자
        "탭\t포함",  # 공백류
        "",  # 빈 문자열
    ],
)
def test_invalid_nicknames(nickname: str) -> None:
    with pytest.raises(service.NicknameError):
        service.validate_nickname_format(nickname)
