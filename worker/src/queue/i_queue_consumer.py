from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List

MessageHandler = Callable[[Dict[str, Any]], None]


class IQueueConsumer(ABC):
    @abstractmethod
    def connect(self) -> None:
        """Establish and verify connection to the queue backend."""
        ...

    @abstractmethod
    def consume(self, queues: List[str], handler: MessageHandler) -> None:
        """Block indefinitely, delivering each message from any of the given queues to handler."""
        ...

    @abstractmethod
    def close(self) -> None:
        """Release connection resources."""
        ...
